
.. _extension-authors:

For Extension Authors
=====================


If you have developed an extension for JupyterLab, please ensure that
your extension is discoverable by jupyterlab-discovery by adding the
following keyword to your package.json::

    "keywords": [
        "jupyterlab extension",
        ... any other keywords you have
    ]

that is, 'jupyterlab extension' as *one* keyword. This allows
jupyterlab-discovery to make a clear distinction of actual extensions
for jupyterlab.


.. danger::

    Installing an extension allows for arbitrary code execution on the
    server, kernel, and in the client's browser. You should therefore
    take steps to protect against malicious changes to your extension's
    code. This includes ensuring strong authentication for your npm
    account.



.. _ext-author-companion-packages:

Companion Packages
------------------

If your package depends on the presence of one or more packages in the
kernel, or an a notebook server extension, you can indicate this to
jupyterlab-discovery by adding the following to your package.json::

    "jupyterlab": {
      "discovery": {
        "kernel": {
          "kernel_spec": {
            "language": "<regexp for matching kernel language>",
            "display_name": "<regexp for matching kernel display name>"   // optional
          },
          "base": {
            "name": "<the name of the kernel package>"
          },
          "overrides": {   // optional
            "<manager name, e.g. 'pip'>": {
              "name": "<name of kenrel package on pip, if it differs from base name>"
            }
          },
          "managers": [   // list of package managers that have your kernel package
              "pip",
              "conda"
          ]
        },
        "server": {
          "base": {
            "name": "<the name of the server extension package>"
          },
          "overrides": {   // optional
            "<manager name, e.g. 'pip'>": {
              "name": "<name of server extension package on pip, if it differs from base name>"
            }
          },
          "managers": [   // list of package managers that have your server extension package
              "pip",
              "conda"
          ]
        }
      }
    }


Currently supported package managers are::

- pip
- conda
