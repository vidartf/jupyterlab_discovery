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
}


export
class ListModel extends VDomModel {
  constructor(entries?: IEntry[]) {
    super();
    this._entries = entries || [];
    this.query
  }

  get entries(): IEntry[] {
    return this._entries;
  }

  static translateEntries(res: ISearchResult): IEntry[] {
    let entries: IEntry[] = [];
    for (let obj of res.objects) {
      let pkg = obj.package;
      entries.push({
        name: pkg.name,
        pure: true,
        description: pkg.description,
        python_package: null,
        installed: false,
        enabled: false,
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

  private _query: string;
  private _page: number;
  private _pagination: number;
  private _totalEntries: number;

  protected _entries: IEntry[];

  protected searcher = new Searcher();
}
