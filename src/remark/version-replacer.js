// This is a remark plugin that replaces the Inspetkor Gadget version in the
// docs. It provides support for two constants:
// - %IG_TAG% - This constant is intended to be used for container images. For
//   releases it contains the version number with the "v" prefix. For the latest
//   version it contains the "latest" string.
// - %IG_BRANCH%' - This constant contains the tag of the name of the branch

import { visit } from 'unist-util-visit';

const tagConstant = '%IG_TAG%';
const branchConstant = '%IG_BRANCH%';

export default function versionReplacer() {
  return (tree, vfile) => {
    // Extract the version from the path of the file being built
    const versionMatch = vfile.path.match(/version-v(\d+\.\d+\.\d+)/);
    const version = versionMatch ? "v"+versionMatch[1] : null;

    const tag = version ? version : 'latest';
    const branch = version ? version : 'main';

    // Traverse the MDX AST tree
    visit(tree, (node) => {
      // Handle regular text nodes
      if (node.type === 'text') {
        if (node.value.includes(tagConstant)) {
          node.value = node.value.replace(new RegExp(tagConstant, 'g'), tag);
        }
        if (node.value.includes(branchConstant)) {
          node.value = node.value.replace(new RegExp(branchConstant, 'g'), branch);
        }
      }

      // Handle code block nodes
      if (node.type === 'code' || node.type === 'inlineCode') {
        if (node.value.includes(tagConstant)) {
          node.value = node.value.replace(new RegExp(tagConstant, 'g'), tag);
        }
        if (node.value.includes(branchConstant)) {
          node.value = node.value.replace(new RegExp(branchConstant, 'g'), branch);
        }

      // Handle links
      } else if (node.type === 'link') {
        if (node.url.includes(tagConstant)) {
          node.url = node.url.replace(new RegExp(tagConstant, 'g'), tag);
        }
        if (node.url.includes(branchConstant)) {
          node.url = node.url.replace(new RegExp(branchConstant, 'g'), branch);
        }
      }
    });
  };
}
