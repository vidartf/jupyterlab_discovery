'use strict'

import * as React from 'react';

import {
  VDomRenderer
} from '@jupyterlab/apputils';

import * as ReactPaginate from 'react-paginate';

import {
  ListModel, IEntry, Action
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

function ListEntry(props: {entry: IEntry, performAction: (action: Action, entry: IEntry) => void}): React.ReactElement<any> {
  const {entry} = props;
  const flagClasses = [];
  if (entry.python_package) {
    flagClasses.push('jp-discovery-entry-pure');
  }
  if (entry.installed) {
    flagClasses.push('jp-discovery-entry-installed');
  }
  if (entry.enabled) {
    flagClasses.push('jp-discovery-entry-enabled');
  }
  if (ListModel.entryHasUpdate(entry)) {
    flagClasses.push('jp-discovery-entry-update');
  }
  if (entry.status && ['ok', 'warning', 'error'].indexOf(entry.status) !== -1) {
    flagClasses.push(`jp-discovery-entry-${entry.status}`);
  }
  return (
    <li className={`jp-discovery-entry ${flagClasses.join(' ')}`}>
      <div className='jp-discovery-entry-name'>{entry.name}</div>
      <div className='jp-discovery-entry-description'>{entry.description}</div>
      <button
        className='jp-discovery-install'
        onClick={() => props.performAction('install', entry)}
      >
        Install
      </button>
      <button
        className='jp-discovery-update'
        // An install action will update the extension:
        onClick={() => props.performAction('install', entry)}
      >
        Update
      </button>
      <button
        className='jp-discovery-uninstall'
        onClick={() => props.performAction('uninstall', entry)}
      >
        Uninstall
      </button>
      <button
        className='jp-discovery-enable'
        onClick={() => props.performAction('enable', entry)}
      >
        Enable
      </button>
      <button
        className='jp-discovery-disable'
        onClick={() => props.performAction('disable', entry)}
      >
        Disable
      </button>
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
      <ListEntry entry={entry} key={entry.name} performAction={props.performAction}/>
    );
  }
  let pagination;
  if (props.numPages > 1) {
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
    entries: ReadonlyArray<IEntry>;
    numPages: number;
    onPage: (page: number) => void;
    performAction: (action: Action, entry: IEntry) => void;
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
    const model = this.model!;
    let pages = Math.ceil(model.totalEntries / model.pagination);
    let elements = [
      <SearchBar
        key='searchbar'
        placeholder='SEARCH'
        onSearch={(value) => { this.onSearch(value); }}
      />,
    ];
    if (!model.initialized) {
      model.initialize();
      elements.push(
        <div className="jp-discovery-loader">Updating extensions list</div>
      )
    }
    if (model.installed.length) {
      elements.push(
        <header>Installed</header>,
        <ListView
          key='installed'
          entries={model.installed}
          numPages={1}
          onPage={(value) => {}}
          performAction={this.onAction.bind(this)}
          />,
      );
    }
    if (model.installable.length) {
      elements.push(
        <header>Available</header>,
        <ListView
          key='installable'
          entries={model.installable}
          numPages={pages}
          onPage={(value) => { this.onPage(value); }}
          performAction={this.onAction.bind(this)}
        />,
      );
    } else if (model.offline) {
      elements.push(
        <header>Available</header>,
        <div className="jp-discovery-error">Error searching for extensions{model.errorMessage ?`: ${model.errorMessage}` : '.' }</div>,
      );
    }
    return elements;
  }

  onSearch(value: string) {
    this.model!.query = value;
  }

  onPage(value: number) {
    this.model!.page = value;
  }

  onAction(action: Action, entry: IEntry) {
    switch(action) {
    case 'install':
      return this.model!.install(entry);
    case 'uninstall':
      return this.model!.uninstall(entry);
    case 'enable':
      return this.model!.enable(entry);
    case 'disable':
      return this.model!.disable(entry);
    default:
      throw new Error(`Invalid action: ${action}`)
    }
  }
}
