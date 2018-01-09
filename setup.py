#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function

import os
from glob import glob

from setuptools import setup, find_packages

from setupbase import (
    create_cmdclass, install_npm, ensure_targets,
    combine_commands, get_version, ensure_python,
)

pjoin = os.path.join
here = os.path.abspath(os.path.dirname(__file__))
name = 'jupyterlab_discovery'

ensure_python(('== (2.7)', '> (3, 3)'))


package_data = {
    name: [
    ]
}

version = get_version(pjoin(here, name, '_version.py'))


cmdclass = create_cmdclass(
    'js',
    data_files_spec=[
        ('share/jupyter/lab/extensions',
         'lab-dist', '*.tgz'),
        ('etc/jupyter/jupyter_notebook_config.d',
         'jupyter-config/jupyter_notebook_config.d',
         'jupyterlab-discovery.json'),
    ],
)
cmdclass['js'] = combine_commands(
    install_npm(
        path=here,
        build_dir=os.path.join(here, 'lib'),
        source_dir=os.path.join(here, 'src'),
        build_cmd='build:labextension',
    ),
    ensure_targets([
        pjoin(here, 'lib', 'plugin.js'),
    ]),
)


setup_args = dict(
    name            = name,
    description     = "Diff and merge of Jupyter Notebooks",
    version         = version,
    scripts         = glob(pjoin('scripts', '*')),
    cmdclass        = cmdclass,
    packages        = find_packages(here),
    package_data    = package_data,
    install_requires = [
        'jupyterlab',
        'tornado',
        'notebook',
    ],
    extras_require  = {
        'test': [
        ],
    },
    author          = 'Jupyter Development Team',
    author_email    = 'jupyter@googlegroups.com',
    url             = 'http://jupyter.org',
    license         = 'BSD',
    platforms       = "Linux, Mac OS X, Windows",
    keywords        = ['Interactive', 'Interpreter', 'Shell', 'Web'],
    classifiers     = [
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Framework :: Jupyter',
    ],
    entry_points    = {
        'console_scripts': [],
    }
)


if __name__ == '__main__':
    setup(**setup_args)
