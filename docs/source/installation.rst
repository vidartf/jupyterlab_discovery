.. _Installation:

Installation
============

There are two parts to the jupyterlab-discovery extension:

- A JupyterLab extension for the user interface.
- A jupyter notebook server extension for doing the management of the extension on the server.

Installing the Python package ``jupyterlab-discovery`` is the first step. It should be installed
from the environment in which you normally run the ``jupyter lab`` command. From within JupyterLab
itself, you can gain access to this environment by opening a `terminal`_. The command to install
the package is::

    pip install jupyterlab-discovery

If you are on Jupyter Notebook version 5.3 or greater, that package and a restart of the notebook
server should normally be sufficient to start using the extension. With older versions of the
notebook package, you will also have to run the following commands::

    jupyter serverextension enable [--sys-prefix | --user | --system] jupyterlab_discovery
    jupyter labextension install [--sys-prefix | --user | --system] --py jupyterlab_discovery
    jupyter labextension enable [--sys-prefix | --user | --system] --py jupyterlab_discovery

where the flags ``[--sys-prefix | --user | --system]`` are `as specified here`_.

.. links

.. _`as specified here`: https://jupyter-notebook.readthedocs.io/en/stable/extending/frontend_extensions.html#installing-and-enabling-extensions


.. _`terminal`: http://jupyterlab.readthedocs.io/en/stable/user/terminal.html
