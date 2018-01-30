// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  Kernel, ServiceManager, KernelMessage, TerminalSession
} from '@jupyterlab/services';

import {
  h
} from '@phosphor/virtualdom';

import {
  KernelCompanion
} from './model';

import {
  IKernelInstallInfo, IInstallInfoEntry, IInstallInfo
} from './query';


/**
 * Prompt the user what do about companion packages, if present
 *
 * @param builder the build manager
 */
export
function presentCompanions(kernelCompanions: KernelCompanion[],
                           serverCompanion: IInstallInfo | undefined,
                           serviceManager: ServiceManager): Promise<boolean> {
  let entries = [];
  if (serverCompanion) {
    entries.push(h.p(
      'This package has indicated that it needs a corresponding server extension: ',
      h.code(serverCompanion.base.name!),
    ));
  }
  if (kernelCompanions) {
    entries.push(
      h.p('This package has indicated that it needs a corresponding package for the kernel.')
    );
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
  }
  let body = h.div(
    ...entries
  );
  let prompt: string;
  if (kernelCompanions && serverCompanion) {
    prompt = 'Install Companions';
  } else if (kernelCompanions) {
    prompt = 'Install in Kernel';
  } else {
    prompt = 'Install Server Ext';
  }
  return showDialog({
    title: 'Kernel companions',
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.warnButton({
        label: prompt,
        caption: 'Try to install the package into the selected kernels.'
      }),
      Dialog.okButton({
        label: 'Install Ext Only',
        caption: 'Install only the Jupyterlab frontend extension.'
      })],
  }).then(result => {
    if (result.button.label === prompt) {
      return promptInstallCompanions(kernelCompanions, serverCompanion, serviceManager);
    }
    return result.button.label === 'Install Ext Only';
  });
}


/**
 * Prompt the user what do about companion packages, if present
 *
 * @param builder the build manager
 */
export
function promptInstallCompanions(kernelCompanions: KernelCompanion[],
                                 serverCompanion: IInstallInfo | undefined,
                                 serviceManager: ServiceManager): Promise<boolean> {
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
        h.select({
          onchange: (event) => {
            config[lookupName].manager = (event.target as HTMLSelectElement).value;
          },
        }, ...managerOptions),
        ...kernelEntries
    ));
  }
  let serverEntries = [];
  let serverManager = ''
  if (serverCompanion) {
    // Add select for picking which package panager to use
    let managerOptions = [];
    serverManager = serverCompanion.managers[0] || '';
    for (let m of serverCompanion.managers || []) {
      managerOptions.push(h.option({value: m}, m))
    }
    managerOptions.push(h.option({value: "-- Do nothing --"}));
    serverEntries.push(h.p(
      'Server extension install ',
      h.code(serverCompanion.base.name!),
      h.select(
        {
          onchange: (event) => {
            serverManager = (event.target as HTMLSelectElement).value;
          },
        },
        ...managerOptions),
    ));
  }
  let body = h.div(
    ...serverEntries,
    h.p('Which kernel(s) do you want to install into?'),
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

    if (serverCompanion) {
      serviceManager.terminals.startNew().then((terminal) => {
        let override = {};
        if (serverCompanion.overrides && serverManager in serverCompanion.overrides) {
          override = serverCompanion.overrides[serverManager]!;
        }
        let info = {
          ...serverCompanion.base,
          ...override,
        };
        installOnServer(terminal, serverManager, info).catch(() => {
          terminal.shutdown();
        });
      });
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
  let code: string | undefined;
  if (manager === 'pip') {
    code = `
import sys
from subprocess import check_call
check_call([sys.executable, '-m', 'pip', 'install', '${info.name}'])
`;

  } else if (manager === 'conda') {
    code = `
import sys
from subprocess import check_call
import os
pjoin = os.path.join
cmd_opt = ['install', '--prefix', sys.prefix, '--yes', '--quiet', '${info.name}']
try:
    check_call([pjoin(sys.prefix, 'bin', 'conda')] + cmd_opt)
except FileNotFoundError:
    if os.name == 'nt':
        check_call([pjoin(sys.prefix, 'Scripts', 'conda')] + cmd_opt)
    else:
        raise
`;

  }
  if (code) {
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


function installOnServer(terminal: TerminalSession.ISession,
                         manager: string,
                         info: IInstallInfoEntry): Promise<void> {
  let cmd = '';
  if (manager === 'pip') {
    cmd += `pip install ${info.name}`;
  } else if (manager === 'conda') {
    cmd += `conda install --yes --quiet ${info.name}`;
  }
  cmd += '\r';

  return new Promise((resolve) => {
    //let output = '';
    const onMessage = function(session: TerminalSession.ISession, msg: TerminalSession.IMessage) {
      switch (msg.type) {
      case 'stdout':
        if (msg.content) {
          //output += msg.content[0];
        }
        break;
      case 'disconnect':
        session.messageReceived.disconnect(onMessage);
        // Process output?
        resolve();
        break;
      default:
        break;
      }
    }
    terminal.ready.then(() => {
      terminal.messageReceived.connect(onMessage);

      terminal.send({
        type: 'stdin',
        content: [cmd]
      });

      terminal.send({
        type: 'stdin',
        content: ['exit\r']
      });
    });
  });

}
