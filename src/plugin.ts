'use strict'

import {
  JupyterLab, JupyterLabPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import {
  ExtensionView
} from './widget';

import '../style/index.css';


/**
 * The discover-view namespace token.
 */
const namespaceToken = 'discoverview';

/**
 * IDs of the commands added by this extension.
 */
namespace CommandIDs {
  export
  const hideDiscover = 'discover:hide-main';

  export
  const showDiscover = 'discover:activate-main';

  export
  const toggleDiscover = 'discover:toggle-main';
}


/**
 * Initialization data for the jupyterlab_discovery extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_discovery',
  autoStart: true,
  requires: [ILayoutRestorer],
  activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
    const { commands, shell, serviceManager} = app;
    const view = new ExtensionView(serviceManager.builder);
    view.id = 'discover.main-view';
    restorer.add(view, namespaceToken);
    view.title.label = 'Extensions';
    shell.addToLeftArea(view, { rank: 100 });


    // If the layout is a fresh session without saved data, open file view.
    app.restored.then(layout => {
      if (layout.fresh) {
        commands.execute(CommandIDs.showDiscover, void 0);
      }
    });

    addCommands(app, view);
  }
};


/**
 * Add the main file view commands to the application's command registry.
 */
function addCommands(app: JupyterLab, view: ExtensionView): void {
  const { commands } = app;

  commands.addCommand(CommandIDs.showDiscover, {
    label: 'Discover extensions',
    caption: 'Show view to discover extensions',
    execute: () => { app.shell.activateById(view.id); }
  });

  commands.addCommand(CommandIDs.hideDiscover, {
    execute: () => {
      if (!view.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });

  commands.addCommand(CommandIDs.toggleDiscover, {
    execute: () => {
      if (view.isHidden) {
        return commands.execute(CommandIDs.showDiscover, void 0);
      } else {
        return commands.execute(CommandIDs.hideDiscover, void 0);
      }
    }
  });

  // TODO: Also add to command palette
}


export default extension;
