'use strict'

import * as React from 'react';

import {
  VDomRenderer
} from '@jupyterlab/apputils';

import ReactTable, { /*Column*/ } from "react-table";

import {
  ListModel, IEntry
} from './model';


export
class SearchBar extends React.Component<{placeholder: string, onSearch: (value: string) => void}, {value: string}> {
  /**
   * Render the list view using the virtual DOM.
   */
  render(): React.ReactElement<any> {
    return (
      <div className='jp-discovery-search-bar'>
        <input
          type="text"
          placeholder={ this.props.placeholder }
          onChange={ this.handleChange.bind(this) }
          value={ this.state.value }
        />
        <button onClick={() => this.props.onSearch(this.state.value)}>Search</button>
      </div>
    );
  }

  handleChange(e: KeyboardEvent) {
    let target = e.target as HTMLInputElement;
    this.setState({
      value: target.value,
    });
  }
}


/**
 * List view widget for extensions
 */
export
function ListView(props: {entries: IEntry[], onPage: (page: number) => void}): React.ReactElement<any> {
  const columns = [
    {
      Header: 'Name',
      accessor: 'name'
    },
    {
      Header: 'Pure',
      accessor: 'pure'
    },
  ];
  const data = this.props.entries;
  return (
    <div className='jp-discovery-list-view'>
      <ReactTable
        data={data}
        columns={columns}
      />
      <div className='jp-disovery-pagination'>

      </div>
    </div>
  );
}


export
class ExtensionView extends VDomRenderer<ListModel> {
  constructor() {
    super();
    this.model = new ListModel();
  }

  /**
   * Render the list view using the virtual DOM.
   */
  protected render(): React.ReactElement<any> {
    return (
      <div className='jp-dicovery-view'>
        <SearchBar
          placeholder='Limit search'
          onSearch={this.onSearch}
        />
        <ListView
          entries={this.model!.entries}
          onPage={this.onPage}
        />
      </div>
    );
  }

  onSearch(value: string) {
    this.model!.query = value;
  }

  onPage(value: number) {
    this.model!.page = value;
  }
}
