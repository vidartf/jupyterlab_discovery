'use strict'


/**
 * Information about a person in search results.
 */
export
interface IPerson {
  username: string,
  email: string
}


/**
 * NPM registry search result structure.
 */
export
interface ISearchResult {
  objects: {
    package: {
      name: string;
      scope: string;
      version: string;
      description: string;
      keywords: string[];
      date: string;
      links: {[key: string]: string};
      publisher: IPerson;
      maintainers: IPerson[];
    };
    flags: {
      insecure: number;
      unstable: boolean;
    };
    score: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
    searchScore: number;
  }[];
  total: number;
  time: string;
}

/**
 * An interface for a subset of the keys known to be included for package metadata.
 *
 * See https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
 * for full specification.
 */
export
interface IPackageMetadata {
  name: string;
  modified: string;
  "dist-tags": {
      latest: string;
      [key: string]: string;
  },
  description: string;
  versions: {
    [key: string]: {
      name: string;
      version: string;
      deprecated?: string;
      description: string
    }
  }
}


export
interface IInstallInfoEntry {
  name?: string;
  bundles_extension?: boolean;
}


export
interface IInstallInfo {
  base: IInstallInfoEntry;
  managers: string[];
  overrides?: { [key: string]: IInstallInfoEntry | undefined };
}

export
interface IKernelInstallInfo extends IInstallInfo {
  kernel_spec: {
    language?: string;
    display_name? : string;
  }
}


export
interface IDiscoveryMetadata {
  server?: IInstallInfo;
  kernel?: IKernelInstallInfo[];
}

export
interface IJupyterLabPackageData {
  jupyterlab?: {
    discovery?: IDiscoveryMetadata;
  }
}


/**
 * Searches the NPM registry via web API: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
 */
export
class Searcher {

  constructor(repoUri='https://registry.npmjs.org/') {
    this.repoUri = repoUri;
  }

  /**
   * Search for a jupyterlab extension.
   * 
   * @param query The query to send. `keywords:"jupyterlab extension"` will be appended to the query.
   * @param page The page of results to fetch.
   * @param pageination The pagination size to use. See registry API documentation for acceptable values.
   */
  searchExtensions(query: string, page=0, pageination=250): Promise<ISearchResult> {
    const uri = new URL('/-/v1/search', this.repoUri);
    // Note: Spaces are encoded to '+' signs!
    let text = `${query} keywords:"jupyterlab extension"`
    uri.searchParams.append('text', text);
    uri.searchParams.append('size', pageination.toString());
    uri.searchParams.append('from', (pageination * page).toString());
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return [];
    });
  }

  /**
   * Fetch package.json of a package
   *
   * @type {string}
   * @memberof Searcher
   */
  fetchPackageData(name: string, version: string): Promise<IJupyterLabPackageData | null> {
    const uri = new URL(`/${name}@${version}/package.json`, 'https://unpkg.com');
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return null;
    });
  }

  repoUri: string;
}
