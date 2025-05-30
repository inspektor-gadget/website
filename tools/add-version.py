#!/bin/env python3
import sys

import yaml
from yaml import load, dump

try:
    from yaml import CDumper as Dumper
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Dumper, Loader

docsfetcher = __import__('docs-fetcher')

# 3 versions and latest.
MAXIMUM_LATEST_VERSIONS = 4

def add_version(config_file_path, version, max_versions):
    config_file = open(config_file_path, "r")
    config = yaml.safe_load(config_file)
    config_file.close()

    new_version = {
        'repo': 'https://github.com/inspektor-gadget/inspektor-gadget.git',
        'name': version,
        'branch': version,
        'dir': 'docs',
    }

    new_version_latest = {
        'repo': 'https://github.com/inspektor-gadget/inspektor-gadget.git',
        'name': 'latest',
        'branch': version,
        'dir': 'docs',
    }

    external_docs = config['params']['docs']['external_docs']
    new_external_docs = [new_version_latest, new_version]

    count = 2
    for docs in external_docs:
        if count >= max_versions:
            break
        if docs['name'] == 'latest' or docs['name'] == 'main' or docs['name'] == version:
            continue
        new_external_docs.append(docs)
        count += 1

    main_version = {
        'repo': 'https://github.com/inspektor-gadget/inspektor-gadget.git',
        'name': 'main',
        'branch': 'main',
        'dir': 'docs',
    }

    new_external_docs.append(main_version)
    config['params']['docs']['external_docs'] = new_external_docs

    config_file = open(config_file_path, "w")
    config_file.write(yaml.dump(config, sort_keys=False))
    config_file.close()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f'Usage: {sys.argv[0]} config_yaml_path version')
        exit(-1)

    add_version(sys.argv[1], sys.argv[2], MAXIMUM_LATEST_VERSIONS)
