"""Tornado handlers for extension management."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from concurrent.futures import ThreadPoolExecutor
import json
from threading import Event

from notebook.base.handlers import APIHandler
from tornado import gen, web
from tornado.concurrent import run_on_executor

from jupyterlab.commands import (
    list_extensions, install_extension, uninstall_extension,
    enable_extension, disable_extension
)


class ExtensionManager(object):
    def __init__(self, log, app_dir):
        self.log = log
        self.app_dir = app_dir

    @run_on_executor
    def list_extensions(self):
        # TODO: Include status
        return list_extensions(app_dir=self.app_dir, logger=self.log)

    @run_on_executor
    def install(self, extension):
        return install_extension(extension, app_dir=self.app_dir, logger=self.log)

    @run_on_executor
    def uninstall(self, extension):
        return uninstall_extension(extension, app_dir=self.app_dir, logger=self.log)

    @run_on_executor
    def enable(self, extension):
        return enable_extension(extension, app_dir=self.app_dir, logger=self.log)

    @run_on_executor
    def disable(self, extension):
        return disable_extension(extension, app_dir=self.app_dir, logger=self.log)


class ExtensionHandler(APIHandler):

    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    @gen.coroutine
    def get(self):
        extensions = self.manager.list_extensions()
        self.finish(json.dumps(extensions))

    @web.authenticated
    @gen.coroutine
    def post(self):
        data = self.get_json_body()
        if (data.cmd not in ('install', 'uninstall', 'enable', 'disable') or
                not data.extension_name):
            raise web.HTTPError(
                422, 'Could not process instrution %r with extension name %r' % (
                    data.cmd, data.extension_name))

        # TODO: Can we trust extension_name? Does it need sanitation?
        try:
            if data.cmd == 'install':
                yield self.manager.install(data.extension_name)
            elif data.cmd == 'uninstall':
                yield self.manager.uninstall(data.extension_name)
            elif data.cmd == 'enable':
                yield self.manager.enable(data.extension_name)
            elif data.cmd == 'disable':
                yield self.manager.disable(data.extension_name)
        except Exception as e:
            raise web.HTTPError(500, str(e))

        self.set_status(200)


# The path for lab extensions handler.
extensions_handler_path = r"/lab/api/extensions"
