// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  h
} from '@phosphor/virtualdom';


/**
 * Show a dialog box reporting an error during installation of an extension.
 *
 * @param name The name of the extension
 * @param errorMessage Any error message giving details about the failure.
 */
export
function reportInstallError(name: string, errorMessage?: string) {
  let entries = [];
  entries.push(h.p(
    'An error occurred installing ',
    h.code(name),
    '.',
  ));
  if (errorMessage) {
    entries.push(h.p(
      h.span({className: 'jp-discovery-dialog-subheader'}, 'Error message:'),
      h.pre(errorMessage.trim()),
    ));
  }
  let body = h.div(
    {className: 'jp-discovery-dialog'},
    ...entries
  );
  showDialog({
    title: 'Extension Installation Error',
    body,
    buttons: [
      Dialog.warnButton({label: 'OK'})
    ],
  });
}
