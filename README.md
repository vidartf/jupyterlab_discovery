# jupyterlab_discovery

[![Documentation Status](https://readthedocs.org/projects/jupyterlab-discovery/badge/?version=stable)](http://jupyterlab-discovery.readthedocs.io/en/stable/?badge=stable)

A JupyterLab extension to facilitate the discovery and installation of other extensions


## Prerequisites

* JupyterLab

## Installation

```bash
pip install jupyterlab-discovery
```

For older versions of jupyter notebook, you will also need to run

```bash
jupyter serverextension enable [--sys-prefix|--user|--system] jupyterlab_discovery
```

## Documentation

Visit http://jupyterlab-discovery.readthedocs.io/

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
pip install -e .
jupyter labextension install .
jupyter serverextension enable [--sys-prefix|--user|--system] jupyterlab_discovery
```

To rebuild the package and the JupyterLab app:

```bash
jupyter lab build
```
