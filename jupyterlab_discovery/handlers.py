"""Tornado handlers for extension management."""

# Copyright (c) Simula Research.
# Distributed under the terms of the Modified BSD License.

try:
    from io import StringIO
except ImportError:
    from StringIO import StringIO
import json
from subprocess import check_output, CalledProcessError, TimeoutExpired, STDOUT
import os
import re

from concurrent.futures import ThreadPoolExecutor
from threading import Event

from notebook.base.handlers import APIHandler
from tornado import gen, web
from tornado.ioloop import IOLoop
from tornado.concurrent import run_on_executor

from jupyterlab.jlpmapp import YARN_PATH, HERE as jlab_dir
from jupyterlab.commands import (
    get_app_info, install_extension, uninstall_extension,
    enable_extension, disable_extension, _read_package,
    _AppHandler
)

try:
    from urllib.error import URLError
except ImportError:
    from urllib2 import URLError


def _make_extension_entry(name, description, enabled, core, latest_version,
                          installed_version, status, installed=None):
    """Create an extension entry that can be sent to the client"""
    ret = dict(
        name=name,
        description=description,
        enabled=enabled,
        core=core,
        latest_version=latest_version,
        installed_version=installed_version,
        status=status,
    )
    if installed is not None:
        ret['installed'] = installed
    return ret


def _ensure_compat_errors(info, app_dir, logger):
    """Ensure that the app info has compat_errors field"""
    handler = _AppHandler(app_dir, logger)
    info['compat_errors'] = handler._get_extension_compat()


_message_map = {
    'install': re.compile(r'(?P<name>.*) needs to be included in build'),
    'uninstall': re.compile(r'(?P<name>.*) needs to be removed from build'),
    'update': re.compile(r'(?P<name>.*) changed from (?P<oldver>.*) to (?P<newver>.*)'),
}

def _build_check_info(app_dir, logger):
    """Get info about packages scheduled for (un)install/update"""
    handler = _AppHandler(app_dir, logger)
    messages = handler.build_check(fast=True)
    # Decode the messages into a dict:
    status = {'install': [], 'uninstall': [], 'update': []}
    for msg in messages:
        for key, pattern in _message_map.items():
            match = pattern.match(msg)
            if match:
                status[key].append(match.group('name'))
    return status


class ExtensionManager(object):
    executor = ThreadPoolExecutor(max_workers=5)

    def __init__(self, log, app_dir):
        self.log = log
        self.app_dir = app_dir
        self._outdated = None
        # Start fetching data on outdated extensions immediately
        IOLoop.current().spawn_callback(self._get_outdated)

    @gen.coroutine
    def list_extensions(self):
        """Handle a request for all installed extensions"""
        info = get_app_info(app_dir=self.app_dir, logger=self.log)
        build_check_info = _build_check_info(self.app_dir, self.log)
        _ensure_compat_errors(info, self.app_dir, self.log)
        extensions = []
        # TODO: Ensure loops can run in parallel
        for name, data in info['extensions'].items():
            status = 'ok'
            pkg_info = yield self._get_pkg_info(name, data)
            latest_version = pkg_info['wanted_version']
            if info['compat_errors'].get(name, None):
                status = 'error'
                # If errored, we cannot trust wanted_version
                handler = _AppHandler(self.app_dir, self.log)
                try:
                    latest_version = handler._latest_compatible_package_version(name)
                except URLError:
                    pass
            else:
                for packages in build_check_info.values():
                    if name in packages:
                        status = 'warning'
            extensions.append(_make_extension_entry(
                name=name,
                description=pkg_info['description'],
                enabled=(name not in info['disabled']),
                core=False,
                # Use wanted version to ensure we limit ourselves
                # within semver restrictions
                latest_version=latest_version,
                installed_version=data['version'],
                status=status,
            ))
        for name in build_check_info['uninstall']:
            data = yield self._get_scheduled_uninstall_info(name)
            extensions.append(_make_extension_entry(
                name=name,
                description=data['description'],
                installed=False,
                enabled=False,
                core=False,
                latest_version=data['version'],
                installed_version=data['version'],
                status='warning',
            ))
        raise gen.Return(extensions)

    @run_on_executor
    def install(self, extension):
        """Handle an install/update request"""
        try:
            install_extension(extension, app_dir=self.app_dir, logger=self.log)
        except ValueError as e:
            raise gen.Return(dict(status='error', message=str(e)))
        raise gen.Return(dict(status='ok',))

    @run_on_executor
    def uninstall(self, extension):
        """Handle an uninstall request"""
        did_uninstall = uninstall_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok' if did_uninstall else 'error',))

    @run_on_executor
    def enable(self, extension):
        """Handle an enable request"""
        enable_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok',))

    @run_on_executor
    def disable(self, extension):
        """Handle a disable request"""
        disable_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok',))

    @gen.coroutine
    def _get_pkg_info(self, name, data):
        """Get information about a package"""
        info = _read_package(data['path'])
        outdated = yield self._get_outdated()
        if outdated and name in outdated:
            info['latest_version'] = outdated[name]['latest_version']
            # Ensure wanted version is compatible with current lab
            handler = _AppHandler(self.app_dir, self.log)
            try:
                info['wanted_version'] = handler._latest_compatible_package_version(name)
            except URLError:
                # Fallback to using data from outdated
                info['wanted_version'] = outdated[name]['wanted_version']
        else:
            info['wanted_version'] = info['version']
            info['latest_version'] = info['version']

        raise gen.Return(info)

    def _get_outdated(self):
        """Get a Future to information from `npm/yarn outdated`.

        This will cache the results. To refresh the cache, set
        self._outdated to None before calling. To bypass the cache,
        call self._load_outdated directly.
        """
        # Ensure self._outdated is a Future for data on outdated extensions
        if self._outdated is None:
            self._outdated = self._load_outdated()
        # Return the Future
        return self._outdated


    @run_on_executor
    def _load_outdated(self):
        """Load information from `npm/yarn outdated`"""
        cache = {}
        try:
            # Note: We cannot use shell=True on Windows, as that will hang if
            # the command times out (which will happen when offline)
            output = check_output(['node', YARN_PATH, 'outdated', '--json'],
                                  cwd=os.path.join(jlab_dir, 'staging'),
                                  stderr=STDOUT,
                                  timeout=10,
                                 )
        except CalledProcessError as e:
            output = e.output
        except TimeoutExpired as e:
            self.log.error('"yarn outdated" timed out, could not fetch extension status')
            return None
        output = output.decode('utf-8')
        outdated_data = json.loads('[%s]' % ','.join(output.splitlines()))
        for de in outdated_data:
            if de['type'] == 'table' and 'data' in de and 'body' in de['data']:
                for entry in de['data']['body']:
                    # name, current, wanted, latest, ...
                    # wanted = latest that satisfy semver req
                    if len(entry) >= 4:
                        cache[entry[0]] = {
                            'wanted_version': entry[2],
                            'latest_version': entry[3],
                        }
        return cache

    @run_on_executor
    def _get_scheduled_uninstall_info(self, name):
        """Get information about a package that is scheduled for uninstallation"""
        target = os.path.join(
            self.app_dir, 'staging', 'node_modules', name, 'package.json')
        if os.path.exists(target):
            with open(target) as fid:
                return json.load(fid)
        else:
            return None


class ExtensionHandler(APIHandler):

    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    @gen.coroutine
    def get(self):
        """GET query returns info on all installed extensions"""
        extensions = yield self.manager.list_extensions()
        self.finish(json.dumps(extensions))

    @web.authenticated
    @gen.coroutine
    def post(self):
        """POST query performs an action on a specific extension"""
        data = self.get_json_body()
        cmd = data['cmd']
        name = data['extension_name']
        if (cmd not in ('install', 'uninstall', 'enable', 'disable') or
                not name):
            raise web.HTTPError(
                422, 'Could not process instrution %r with extension name %r' % (
                    cmd, name))

        # TODO: Can we trust extension_name? Does it need sanitation?
        #       It comes from an authenticated session, but its name is
        #       ultimately from the NPM repository.
        ret_value = None
        try:
            if cmd == 'install':
                ret_value = yield self.manager.install(name)
            elif cmd == 'uninstall':
                ret_value = yield self.manager.uninstall(name)
            elif cmd == 'enable':
                ret_value = yield self.manager.enable(name)
            elif cmd == 'disable':
                ret_value = yield self.manager.disable(name)
        except gen.Return as e:
            ret_value = e.value
        except Exception as e:
            raise web.HTTPError(500, str(e))

        if ret_value is None:
            self.set_status(200)
        else:
            self.finish(json.dumps(ret_value))


# The path for lab extensions handler.
extensions_handler_path = r"/discovery/api/extensions"
