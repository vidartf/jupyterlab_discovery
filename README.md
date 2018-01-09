# jupyterlab_discovery

A JupyterLab extension to facilitate the discovery and installation of other extensions


## Prerequisites

* JupyterLab

## Installation

```bash
jupyter serverextension enable --sys-prefix --py jupyterlab_discovery
jupyter labextension install jupyterlab_discovery
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
pip install -e .
jupyter labextension install .
```

To rebuild the package and the JupyterLab app:

```bash
jupyter lab build
```
