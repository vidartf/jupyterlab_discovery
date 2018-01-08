"""Tornado handlers for extension management."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

try:
    from io import StringIO
except ImportError:
    from StringIO import StringIO
import json
from subprocess import check_output, CalledProcessError, TimeoutExpired, STDOUT
import os

from concurrent.futures import ThreadPoolExecutor
from threading import Event

from notebook.base.handlers import APIHandler
from tornado import gen, web
from tornado.concurrent import run_on_executor

from jupyterlab.jlpmapp import YARN_PATH, HERE as jlab_dir
from jupyterlab.commands import (
    get_app_info, install_extension, uninstall_extension,
    enable_extension, disable_extension, _read_package,
)


def _make_extension_entry(name, description, enabled, core, latest_version, installed_version, status):
    return dict(
        name=name,
        description=description,
        enabled=enabled,
        core=core,
        latest_version=latest_version,
        installed_version=installed_version,
        status=status,
    )


class ExtensionManager(object):
    executor = ThreadPoolExecutor(max_workers=5)

    def __init__(self, log, app_dir):
        self.log = log
        self.app_dir = app_dir
        self._outdated = {}
        self._load_outdated()

    @run_on_executor
    def list_extensions(self):
        info = get_app_info(app_dir=self.app_dir, logger=self.log)
        extensions = []
        for name, data in info['extensions'].items():
            status = 'ok'
            pkg_info = self._get_pkg_info(name, data)
            # TODO: Make sure JLab always gives compat_errors in info:
            #if name in info['compat_errors']:
            #    status = 'error'
            extensions.append(_make_extension_entry(
                name=name,
                description=pkg_info['description'],
                enabled=(name not in info['disabled']),
                core=False,
                latest_version=pkg_info['wanted_version'],
                installed_version=data['version'],
                status=status,
            ))
        return extensions

    @run_on_executor
    def install(self, extension):
        install_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok',))

    @run_on_executor
    def uninstall(self, extension):
        did_uninstall = uninstall_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok' if did_uninstall else 'error',))

    @run_on_executor
    def enable(self, extension):
        enable_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok',))

    @run_on_executor
    def disable(self, extension):
        disable_extension(extension, app_dir=self.app_dir, logger=self.log)
        raise gen.Return(dict(status='ok',))

    def _get_pkg_info(self, name, data):
        info = _read_package(data['path'])
        if not self._outdated:
            self._load_outdated()
        if name in self._outdated:
            info['wanted_version'] = self._outdated[name]['wanted_version']
            info['latest_version'] = self._outdated[name]['latest_version']
        else:
            info['wanted_version'] = info['version']
            info['latest_version'] = info['version']

        return info

    def _load_outdated(self):
        shell = os.name == 'nt'
        cache = {}
        self._outdated = cache
        try:
            output = check_output(['node', YARN_PATH, 'outdated', '--json'],
                                cwd=os.path.join(jlab_dir, 'staging'),
                                shell=shell,
                                stderr=STDOUT,
                                timeout=10,
                                )
        except CalledProcessError as e:
            output = e.output
        except TimeoutExpired as e:
            self.log.error('"yarn outdated" timed out, could not fetch extension status')
            return
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


class ExtensionHandler(APIHandler):

    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    @gen.coroutine
    def get(self):
        extensions = yield self.manager.list_extensions()
        self.finish(json.dumps(extensions))

    @web.authenticated
    @gen.coroutine
    def post(self):
        data = self.get_json_body()
        cmd = data['cmd']
        name = data['extension_name']
        if (cmd not in ('install', 'uninstall', 'enable', 'disable') or
                not name):
            raise web.HTTPError(
                422, 'Could not process instrution %r with extension name %r' % (
                    cmd, name))

        # TODO: Can we trust extension_name? Does it need sanitation?
        try:
            if cmd == 'install':
                yield self.manager.install(name)
            elif cmd == 'uninstall':
                yield self.manager.uninstall(name)
            elif cmd == 'enable':
                yield self.manager.enable(name)
            elif cmd == 'disable':
                yield self.manager.disable(name)
        except gen.Return:
            raise
        except Exception as e:
            raise web.HTTPError(500, str(e))

        self.set_status(200)


# The path for lab extensions handler.
extensions_handler_path = r"/lab/api/extensions"
