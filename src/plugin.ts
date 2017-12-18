'use strict'

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab_discovery extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_discovery',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab_discovery is activated!');
  }
};

export default extension;
