#!/usr/bin/env python
# -*- coding:utf-8 -*-

from notebook.utils import url_path_join

from jupyterlab.commands import get_app_dir

from .handlers import (
    ExtensionHandler, ExtensionManager, extensions_handler_path,
)


def load_jupyter_server_extension(nbapp):
    """
    Called when the extension is loaded.

    Args:
        nbapp (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    web_app = nbapp.web_app

    app_dir = getattr(nbapp, 'app_dir', get_app_dir())

    extension_manager = ExtensionManager(nbapp.log, app_dir)
    handlers = [
        (extensions_handler_path, ExtensionHandler, {'manager': extension_manager}),
    ]

    # Prefix routes with base_url:
    base_url = web_app.settings.get('base_url', '/')
    handlers = [(url_path_join(base_url, h[0]), h[1], h[2]) for h in handlers]

    host_pattern = '.*$'
    web_app.add_handlers(host_pattern, handlers)
