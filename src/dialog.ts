// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  h
} from '@phosphor/virtualdom';

import {
  KernelCompanion
} from './model';


/**
 * Instruct the server to perform a build
 *
 * @param builder the build manager
 */
export
function presentCompanions(kernelCompanions: KernelCompanion[]): Promise<boolean> {
  if (kernelCompanions) {
    let entries = [];
    for (let entry of kernelCompanions) {
      entries.push(h.p('The package ', h.code(entry.kernelInfo.base['name'] as string),
                   ' is required by the following kernels:'));
      let kernelEntries = [];
      for (let kernel of entry.kernels) {
        kernelEntries.push(h.li(h.code(kernel.display_name)));
      }
      entries.push(h.ul(
        ...kernelEntries
      ));
    }

    let body = h.div(
      h.p('This package has indicated that it needs a corresponding package for the kernel.'),
      ...entries
    );
    return showDialog({
      title: 'Kernel companions',
      body,
      buttons: [Dialog.cancelButton(), Dialog.okButton()],
    }).then(result => {
      return result.button.accept;
    });
  }
  return Promise.resolve(true);
};
