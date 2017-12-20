'use strict'

import {
  VDomModel
} from '@jupyterlab/apputils';

import {
  Searcher, ISearchResult
} from './query';

export
interface IEntry {
  name: string;
  pure: boolean;
  description: string;
  python_package: string | null;
  installed: boolean;
  enabled: boolean;
  official: boolean;
  status: 'ok' | 'warning' | 'error' | null;
}


export
class ListModel extends VDomModel {
  constructor(entries?: IEntry[]) {
    super();
    this._entries = entries || [];
  }

  get entries(): IEntry[] {
    return this._entries;
  }

  static translateEntries(res: ISearchResult): IEntry[] {
    let entries: IEntry[] = [];
    for (let obj of res.objects) {
      let pkg = obj.package;
      if (pkg.name === 'jupyterlab_discovery') {
        continue;  // Let's not include ourself
      }
      entries.push({
        name: pkg.name,
        pure: true,
        description: pkg.description,
        python_package: null,
        installed: false,
        enabled: false,
        official: pkg.scope === 'jupyterlab',
        status: null,
      });
    }
    return entries;
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

  protected update() {
    return this.searcher.searchExtension(this.query, this.page, this.pagination)
      .then((result) => {
        this._entries = ListModel.translateEntries(result);
        this._totalEntries = result.total;
        this.stateChanged.emit(undefined);
      });
  }

  private _query: string = '';
  private _page: number = 0;
  private _pagination: number = 20;
  private _totalEntries: number = 0;

  protected _entries: IEntry[];

  protected searcher = new Searcher();
}
