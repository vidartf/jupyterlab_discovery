'use strict'

import {
  ServerConnection
} from '@jupyterlab/services';

import {
  VDomModel
} from '@jupyterlab/apputils';

import {
  Searcher, ISearchResult
} from './query';

export
interface IEntry {
  name: string;
  description: string;
  python_package: string | null;
  installed: boolean;
  enabled: boolean;
  status: 'ok' | 'warning' | 'error' | 'deprecated' | null;
  latest_version: string;
  installed_version: string;
}


export
interface IInstalledEntry {
  name: string;
  description: string;
  enabled: boolean;
  core: boolean;
  latest_version: string;
  installed_version: string;
  status: 'ok' | 'warning' | 'error' | 'deprecated' | null;
}


const EXTENSION_API_PATH = "lab/api/extensions"

export
type Action = 'install' | 'uninstall' | 'enable' | 'disable';


export
class ListModel extends VDomModel {
  constructor() {
    super();
    this._installed = [];
    this._installable = [];
    this.settings = ServerConnection.makeSettings({withCredentials: true});
  }

  get installed(): ReadonlyArray<IEntry> {
    return this._installed;
  }

  get installable(): ReadonlyArray<IEntry> {
    return this._installable;
  }

  protected async translateSearchResult(res: Promise<ISearchResult>): Promise<{[key: string]: IEntry}> {
    let entries: {[key: string]: IEntry} = {};
    for (let obj of (await res).objects) {
      let pkg = obj.package;
      if (pkg.name === 'jupyterlab_discovery') {
        continue;  // Let's not include ourself
      }
      entries[pkg.name] = {
        name: pkg.name,
        description: pkg.description,
        python_package: null,
        installed: false,
        enabled: false,
        status: null,
        latest_version: pkg.version,
        installed_version: '',
      };
    }
    return entries;
  }

  protected async translateInstalled(res: Promise<IInstalledEntry[]>): Promise<{[key: string]: IEntry}> {
    const promises = [];
    const entries: {[key: string]: IEntry} = {};
    for (let pkg of await res) {
      if (pkg.name === 'jupyterlab_discovery') {
        continue;  // Let's not include ourself
      }
      promises.push(res.then((info) => {
        entries[pkg.name] = {
          name: pkg.name,
          description: pkg.description,
          python_package: null,
          installed: true,
          enabled: pkg.enabled,
          status: pkg.status,
          latest_version: pkg.latest_version,
          installed_version: pkg.installed_version,
        };
      }));
    }
    return Promise.all(promises).then(() => {
      return entries;
    });
  }

  get query(): string {
    return this._query
  }
  set query(value: string) {
    this._query = value;
    this.update();
  }

  get page(): number {
    return this._page
  }
  set page(value: number) {
    this._page = value;
    this.update();
  }

  get pagination(): number {
    return this._pagination
  }
  set pagination(value: number) {
    this._pagination = value;
    this.update();
  }

  get totalEntries(): number {
    return this._totalEntries;
  }

  protected fetchInstalled(): Promise<IInstalledEntry[]> {
    let request: ServerConnection.IRequest = {
      url: EXTENSION_API_PATH,
    };
    return ServerConnection.makeRequest(request, this.settings).then((response) => {
      return response.data as IInstalledEntry[];
    });
  }

  protected async update() {
    let search = this.searcher.searchExtension(this.query, this.page, this.pagination);
    let searchMapPromise = this.translateSearchResult(search);
    let installedMap = await this.translateInstalled(this.fetchInstalled());
    let searchMap = await searchMapPromise;
    let installed: IEntry[] = [];
    for (let key of Object.keys(installedMap)) {
      installed.push(installedMap[key]);
    }
    this._installed = installed;

    let installable: IEntry[] = [];
    for (let key of Object.keys(searchMap)) {
      if (installedMap[key] === undefined) {
        installable.push((searchMap)[key]);
      }
    }
    this._installable = installable;
    this._totalEntries = (await search).total;
    this.stateChanged.emit(undefined);
  }

  _performAction(action: string, entry: IEntry) {
    let request: ServerConnection.IRequest = {
      url: EXTENSION_API_PATH,
      method: 'POST',
      data: JSON.stringify({
        cmd: action,
        extension_name: entry.name,
      }),
    };
    return ServerConnection.makeRequest(request, this.settings).then((response) => {
      return response.data as IInstalledEntry[];
    });
  }

  install(entry: IEntry) {
    if (entry.installed) {
      throw new Error(`Already installed: ${entry.name}`);
    }
    this._performAction('install', entry);
  }

  uninstall(entry: IEntry) {
    if (!entry.installed) {
      throw new Error(`Not installed, cannot uninstall: ${entry.name}`);
    }
    this._performAction('uninstall', entry);
  }

  enable(entry: IEntry) {
    if (entry.enabled) {
      throw new Error(`Already enabled: ${entry.name}`);
    }
    this._performAction('enable', entry);
  }

  disable(entry: IEntry) {
    if (!entry.enabled) {
      throw new Error(`Already disabled: ${entry.name}`);
    }
    this._performAction('disable', entry);
  }

  private _query: string = '';
  private _page: number = 0;
  private _pagination: number = 250;
  private _totalEntries: number = 0;

  protected _installed: IEntry[];
  protected _installable: IEntry[];
  protected settings: ServerConnection.ISettings;

  protected searcher = new Searcher();
}
