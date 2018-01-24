// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  Kernel, ServiceManager, KernelMessage
} from '@jupyterlab/services';

import {
  h
} from '@phosphor/virtualdom';

import {
  KernelCompanion
} from './model';
import { IKernelInstallInfo, IInstallInfoEntry } from './query';


/**
 * Prompt the user what do about companion packages, if present
 *
 * @param builder the build manager
 */
export
function presentCompanions(kernelCompanions: KernelCompanion[], serviceManager: ServiceManager): Promise<boolean> {
  if (kernelCompanions) {
    let entries = [];
    for (let entry of kernelCompanions) {
      entries.push(h.p('The package ', h.code(entry.kernelInfo.base.name!),
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
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({
          label: 'Install in Kernel',
          caption: 'Try to install the package into the selected kernels.'
        }),
        Dialog.okButton({
          label: 'Install Ext Only',
          caption: 'Install only the Jupyterlab frontend extension.'
        })],
    }).then(result => {
      if (result.button.label === 'Install in Kernel') {
        return promptInstallCompanions(kernelCompanions, serviceManager);
      }
      return result.button.label === 'Install Ext Only';
    });
  }
  return Promise.resolve(true);
}


/**
 * Prompt the user what do about companion packages, if present
 *
 * @param builder the build manager
 */
export
function promptInstallCompanions(kernelCompanions: KernelCompanion[], serviceManager: ServiceManager): Promise<boolean> {
  // VDOM entries to put in dialog:
  let entries = [];
  // Config (model) to be filled by dialog:
  let config: {
    [key: string]: {
      kernelInfo: IKernelInstallInfo,
      manager: string,
      selected: {
        [key: string]: Kernel.ISpecModel;
      }
    }
  } = {};
  for (let entry of kernelCompanions) {
    let lookupName = entry.kernelInfo.base.name!;
    let kernelEntries = [];
    // Create initial config:
    config[lookupName] = {
      kernelInfo: entry.kernelInfo,
      manager: entry.kernelInfo.managers[0] || '',
      selected: {},
    }
    for (let kernel of entry.kernels) {
      // For each entry, create a checkbox:
      kernelEntries.push(h.label(
        h.input({type: 'checkbox', value: kernel.name, onchange: () => {
          // Have checkbox toggle modify config:
          let selected = config[lookupName].selected;
          if (kernel.name in selected) {
            delete selected[kernel.name];
          } else {
            selected[kernel.name] = kernel;
          }
        }}),
        kernel.display_name,
        ),
        h.br(),
      );
    }
    // Add select for picking which package panager to use
    let managerOptions = [];
    for (let m of entry.kernelInfo.managers || []) {
      managerOptions.push(h.option({value: m}, m))
    }
    entries.push(
      h.div(
        entry.kernelInfo.base.name!,
        h.select(managerOptions),
        ...kernelEntries
    ));
  }
  let body = h.div(
    h.p('Which kernel do you want to install into?'),
    ...entries
  );
  let dialogPromise = showDialog({
    title: 'Install kernel companions',
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.warnButton({ label: 'Install' })],
  });

  let installPromise = dialogPromise.then((result) => {
    if (!result.button.accept) {
      return;
    }
    // Start launching kernels, build commands, and send commands
    for (let key of Object.keys(config)) {
      let c = config[key];
      for (let kernelName of Object.keys(c.selected)) {
        let spec = c.selected[kernelName];
        serviceManager.sessions.startNew({
          path: uuid(16),
          kernelName: spec.name,
        }).then((session) => {
          let kernel = session.kernel;
          let override = {};
          if (c.kernelInfo.overrides && c.manager in c.kernelInfo.overrides) {
            override = c.kernelInfo.overrides[c.manager]!;
          }
          let info = {
            ...c.kernelInfo.base,
            ...override,
          }
          installOnKernel(kernel, c.manager, info).then(() => {
            session.shutdown();
          });
        });
      }
    }
  });

  return installPromise.then(() => {
    return dialogPromise;
  }).then((result) => {
    if (!result.button.accept) {
      return false;
    }
    // Loop over all configured actions, and see if any bundle JS
    let bundled = false;
    for (let key of Object.keys(config)) {
      let c = config[key];
      let override = {};
      if (c.kernelInfo.overrides && c.manager in c.kernelInfo.overrides) {
        override = c.kernelInfo.overrides[c.manager]!;
      }
      let info = {
        ...c.kernelInfo.base,
        ...override,
      }
      bundled = bundled || !!info.bundles_extension;
    }
    // If JS is bundled, prevent direct install of NPM package
    return !bundled;
  });
}


function installOnKernel(kernel: Kernel.IKernelConnection, manager: string, info: IInstallInfoEntry): Promise<void> {
  if (manager === 'pip') {
    let code = `
import sys
from subprocess import check_call
check_call([sys.executable, '-m', 'pip', 'install', '${info.name}'])
`
    let future = kernel.requestExecute({
      code,
      stop_on_error: true
    });
    return (future.done as Promise<KernelMessage.IExecuteReplyMsg>).then(reply => {
      if (reply.content.status !== 'ok') {
        console.error('Error installing on kernel', reply);
        throw new Error(`Error installing on kernel:\n${reply.content.status}`);
      }
    });
  }
  return Promise.reject(`Unknown manager: ${manager}`);
}
