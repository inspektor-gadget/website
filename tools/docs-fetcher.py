#!/bin/env python3
#
# This script will read a given markdown file's front-matter (see Hugo's definition for context)
# and fetch the external docs repos defined in there.
#

import os
import yaml
import subprocess
import sys
import json
import re
import shutil

from yaml import load, dump
try:
    from yaml import CLoader as Loader, CDumper as Dumper
except ImportError:
    from yaml import Loader, Dumper

TOP_DIR_PATH = os.path.realpath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '..'))

YAML_FRONT_MATTER_DELIM = '---'
EXTERNAL_REPOS_DIR = 'external-docs'
 
with open('config.yaml', 'r') as file:
    config = yaml.safe_load(file)

def get_external_docs_config(file_path):
    contents = []
    with open(file_path, 'r') as f:
        contents = f.read()

    config_yaml = yaml.load(contents, Loader=Loader)

    external_docs = config_yaml.get('params', {}).get('docs', {}).get('external_docs', [])
    return external_docs

def clone_repo(repo_url, name, branch):
    repo_name = os.path.basename(repo_url) + '_' + branch.replace('/', '_') + name
    repo_path = os.path.join(TOP_DIR_PATH, EXTERNAL_REPOS_DIR, repo_name)
    if not os.path.isdir(repo_path):
        subprocess.run(['git', 'clone', '--depth=1', '--branch={}'.format(branch), repo_url, repo_path])
    else:
        # If the repo exists and there are no local changes, then update it so we get the docs up
        # to date.
        try:
            subprocess.check_output(['git', '-C', repo_path, 'diff', '--quiet', 'HEAD'])
        except subprocess.CalledProcessError as e:
            print('Repo "{}" has local changes. Not updating: {}'.format(repo_path, e))
        else:
            subprocess.run(['git', '-C', repo_path, 'pull', '--no-rebase'])
    return repo_name

def fetch_docs(file_path):
    dir_name = ''#os.path.basename(os.path.dirname(file_path))

    external_docs = get_external_docs_config(file_path)

    if not external_docs:
        print('Warning: No external docs in', file_path)
        exit(0)

    for docs in external_docs:
        repo_name = clone_repo(docs['repo'], docs['name'], docs['branch'])
        docs['repo_name'] = repo_name
        docs['file'] = file_path

        copy_external_docs(os.path.join(repo_name, docs['dir']), os.path.join(dir_name, docs['name']))
    
    # create versions.json file
    versions = []
    for docs in external_docs:
        if(docs['name'] != 'latest'):
            versions.append(docs['name'])
    with open(os.path.join(TOP_DIR_PATH, 'versions.json'), 'w') as f:
        json.dump(versions, f)

def convert_admonition(old_md):
    """
    Convert Hugo admonitions to Docusaurus admonitions
    """
    pattern = re.compile(r'(> \[!(\w+)\]\n((> ?.*\n)+))', re.M)
        
    def repl(match):
        type_ = match.group(2).lower()
        # remove > from beggining of each line using re
        content = re.sub(r'^> ?', '', match.group(3), flags=re.M)
        return f':::{type_}\n\n{content}\n:::\n'
    
    return pattern.sub(repl, old_md)

def convert_content_page(file_path):
    """
    Convert Hugo markdown to Docusaurus format
    """
    with open(file_path, 'r') as f:
        contents = f.read()

        # Docusaurus uses sidebar_position instead of weight
        contents = contents.replace('weight: ', 'sidebar_position: ')

        # Links to _index.md should be converted to /
        contents = contents.replace('_index.md', '')

        # Remove empty markdown links
        contents = contents.replace(f']()', '')

        # Convert admonitions
        contents = convert_admonition(contents)

        # Write the file back
        with open(file_path, 'w') as f:
            f.write(contents)


def convert_index(index_path):
    """
    Hugo has _index.md files
    In docusaurus:
     - For auto-generated index pages, we need to use _category_.yaml instead of index.md
     - For index pages with some content we should use index.md
    """
    has_content = False
    with open(index_path, 'r') as f:
        contents = f.read()
        after_frontmatter = contents.split('---')[2].replace(' ', '').replace('\n', '')
        has_content = after_frontmatter != ''
    
    if has_content:
        # if index has a content only rename it
        new_path = index_path.replace('_index.md', 'index.md')
        os.rename(index_path, new_path)
    else:
        # convert it to _category_.yaml
        index_to_cateogory(index_path)

def index_to_cateogory(index_path):
    """
    Convert _index.md to docusaurus _category_.yaml
    """
    new_path = index_path.replace('_index.md', '_category_.yaml')

    # parse frontmatter from file 
    with open(index_path, 'r') as f:
        contents = f.read()
        # Split the file into frontmatter and markdown content
        parts = contents.split('---', 2)
        frontmatter = yaml.safe_load(parts[1])

        # get slug from path
        slug = index_path.split('docs/')[1].replace('_index.md', '')

        # create category file
        category_data = {
            "label": frontmatter['title'],
            "position": frontmatter['weight'],
            "customProps": {
                "description": frontmatter['description']
            },
            "link": {
                "type": "generated-index",
                "title": frontmatter['title'],
                "slug": slug,
            }
        }

        # write file
        with open(new_path, 'w') as f:
            f.write(yaml.dump(category_data))
        
        # delete index file
        os.remove(index_path)


def convert_root_index(file_path):
    """
    Convert root index
    """
    with open(file_path, 'r') as f:
        contents = f.read()

        # Main index page should be first in the sidebar 
        # use regex to replace weight: anynumber to sidebar_position: 1
        contents = re.sub(r'weight: \d+', 'sidebar_position: 1', contents)

        # Write the file back
        with open(file_path, 'w') as f:
            f.write(contents)
         

def convert_hugo_to_docusaurus_format(dst_dir, version_name):
    # make sidebar file in versioned_sidebars
    if version_name != "latest":
        sidebar_file = os.path.join(TOP_DIR_PATH, 'versioned_sidebars', 'version-'+version_name+'-sidebars.json')
        with open(sidebar_file, 'w') as f:
            f.write('{"mainSidebar": [{"type": "autogenerated","dirName": "."}]}')

    # convert _index.md files
    for root, dirs, files in os.walk(dst_dir):
        for file in files:
            if file == '_index.md':
                convert_index(os.path.join(root, file))
    
    # update root index file
    if os.path.exists(os.path.join(dst_dir, 'index.md')):
        convert_root_index(os.path.join(dst_dir, 'index.md'))

    # update contents
    for root, dirs, files in os.walk(dst_dir):
        for file in files:
            if file.endswith('.md') or file.endswith('.mdx'):
                convert_content_page(os.path.join(root, file))

def copy_external_docs(linked_dir, link_name):
    src_dir = os.path.join(EXTERNAL_REPOS_DIR, linked_dir)
    dst_dir = os.path.join(TOP_DIR_PATH, 'docs') if link_name == "latest" else os.path.join(TOP_DIR_PATH, 'versioned_docs', "version-"+link_name)

    print('Copying', src_dir, 'to', dst_dir)

    # copy 
    shutil.copytree(src_dir, dst_dir)

    # convert
    convert_hugo_to_docusaurus_format(dst_dir, link_name)

    # hide folders
    folder_to_hide = config["params"]["docs"]["hide_folders"]
    for folder in folder_to_hide:
        folder_path = os.path.join(dst_dir, folder)
        if os.path.exists(folder_path):
            print("config.yaml hide_folders: Removing folder", folder_path)
            # remove folder from destination
            shutil.rmtree(folder_path)



if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Please pass a file path to it.')
        exit(-1)

    fetch_docs(sys.argv[1])
