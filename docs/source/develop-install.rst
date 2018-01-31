
Developer install
=================


To install a developer version of jupyterlab-discovery, you will first need to clone
the repository::

    git clone https://github.com/vidartf/jupyterlab_discovery.git
    cd jupyterlab_discovery

Next, install it with a develop install using pip::

    pip install -e .

Finally, install the labextension locally::

    jupyter labextension install .

This will cause lab to check for changes to jupyterlab-discovery on reload,
and will rebuild the extension on lab builds. It will also watch the extension
build output if you run the server with the ``--watch`` flag (picks up the
output from ``npm run build`` in the extension directory). However, running
the server in watch mode is not generally conductive to testing the operation
of jupyterlab-discovery, as it prevents lab from checking for added extensions
(at least at the time of writing).
