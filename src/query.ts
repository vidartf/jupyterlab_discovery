'use strict'



export
interface IPerson {
  username: string,
  email: string
}


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


/**
 * Searches the NPM repo via web API: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
 */
export
class Searcher {

  constructor(repoUri='https://registry.npmjs.org/') {
    this.repoUri = repoUri;
  }

  searchExtension(query: string, page=0, pageination=250): Promise<ISearchResult> {
    const uri = new URL('/-/v1/search', this.repoUri);
    // Note: Spaces are encoded to '+' signs!
    let text = `not:insecure ${query} keywords:jupyterlab extension`
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


  findAllExtensions(): Promise<ISearchResult>  {
    const uri = new URL('/-/v1/search', this.repoUri);
    let text = `keywords:jupyterlab+extension not:insecure`
    uri.searchParams.append('text', text);
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return [];
    });
  }

  repoUri: string;
}
