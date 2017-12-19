'use strict'

import * as React from 'react';

import {
  VDomRenderer
} from '@jupyterlab/apputils';

import * as ReactPaginate from 'react-paginate';

import {
  ListModel, IEntry
} from './model';


export
class SearchBar extends React.Component<SearchBar.IProperties, SearchBar.IState> {
  constructor(props: SearchBar.IProperties) {
    super(props);
    this.state = {
      value: '',
    };
  }

  /**
   * Render the list view using the virtual DOM.
   */
  render(): React.ReactElement<any> {
    return (
      <div className='jp-discovery-search-bar p-CommandPalette-search'>
        <div className='p-CommandPalette-wrapper'>
          <input
            type='text'
            className='p-CommandPalette-input'
            placeholder={ this.props.placeholder }
            onChange={ this.handleChange.bind(this) }
            value={ this.state.value }
          />
        </div>
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

export
namespace SearchBar {
  export
  interface IProperties {
    placeholder: string;
    onSearch: (value: string) => void;
  }

  export
  interface IState {
    value: string;
  }
}



function ListEntry(props: {entry: IEntry}): React.ReactElement<any> {
  const {entry} = props;
  const flagClasses = [];
  if (entry.official) {
    flagClasses.push('jp-discovery-entry-official');
  }
  if (entry.pure) {
    flagClasses.push('jp-discovery-entry-pure');
  }
  if (entry.installed) {
    flagClasses.push('jp-discovery-entry-installed');
  }
  if (entry.enabled) {
    flagClasses.push('jp-discovery-entry-enabled');
  }
  if (entry.status && ['ok', 'warning', 'error'].indexOf(entry.status) !== -1) {
    flagClasses.push(`jp-discovery-entry-${entry.status}`);
  }
  return (
    <li className={`jp-discovery-entry ${flagClasses.join(' ')}`}>
      <div className='jp-discovery-entry-name'>{entry.name}</div>
      <div className='jp-discovery-entry-description'>{entry.description}</div>
    </li>
  );
}


/**
 * List view widget for extensions
 */
export
function ListView(props: ListView.IProperties): React.ReactElement<any> {
  const entryViews = [];
  for (let entry of props.entries) {
    entryViews.push(
      <ListEntry entry={entry} key={entry.name}/>
    );
  }
  let pagination;
  if (props.numPages > 0) {
    pagination = (
      <div className='jp-discovery-pagination'>
        <ReactPaginate previousLabel={"<"}
                       nextLabel={">"}
                       breakLabel={<a href="">...</a>}
                       breakClassName={"break-me"}
                       pageCount={props.numPages}
                       marginPagesDisplayed={2}
                       pageRangeDisplayed={5}
                       onPageChange={(data: {selected: number}) => props.onPage(data.selected)}
                       containerClassName={"pagination"}
                       activeClassName={"active"} />
      </div>
    );
  }
  return (
    <div className='jp-discovery-list-view-wrapper'>
      <ul className='jp-discovery-list-view'>
        {entryViews}
      </ul>
      {pagination}
    </div>
  );
}

export
namespace ListView {
  export
  interface IProperties {
    entries: IEntry[];
    numPages: number;
    onPage: (page: number) => void;
  }
}


export
class ExtensionView extends VDomRenderer<ListModel> {
  constructor() {
    super();
    this.model = new ListModel();
    this.addClass('jp-discovery-view');
  }

  /**
   * Render the list view using the virtual DOM.
   */
  protected render(): React.ReactElement<any>[] {
    return [
      <SearchBar
        key='searchbar'
        placeholder='SEARCH'
        onSearch={(value) => { this.onSearch(value); }}
      />,
      <ListView
        key='listview'
        entries={this.model!.entries}
        numPages={(this.model!.totalEntries || 0) / this.model!.pagination}
        onPage={(value) => { this.onPage(value); }}
      />
    ];
  }

  onSearch(value: string) {
    this.model!.query = value;
  }

  onPage(value: number) {
    this.model!.page = value;
  }
}
