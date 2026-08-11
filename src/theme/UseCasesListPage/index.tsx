import React from "react";
import Layout from "@theme/Layout";
import type { Props } from "@theme/BlogListPage";

import { UseCases } from "../../components/UseCases/UseCases";

interface UseCaseFrontMatter {
  placeholder?: boolean;
  gadget: string;
  icon:
    | "globe"
    | "memory"
    | "bolt"
    | "hard-drive"
    | "route"
    | "file-shield";
  platforms: string[];
  signals: string[];
  integrations: string[];
  domains: string[];
  methods: string[];
}

export default function UseCasesListPage({
  items,
  metadata,
}: Props): JSX.Element {
  const useCases = items
    .filter(({ content }) => !content.frontMatter.placeholder)
    .map(({ content }) => {
      const frontMatter = content.frontMatter as typeof content.frontMatter &
        UseCaseFrontMatter;

      return {
        title: content.metadata.title,
        description: content.metadata.description,
        permalink: content.metadata.permalink,
        gadget: frontMatter.gadget,
        icon: frontMatter.icon,
        platforms: frontMatter.platforms,
        signals: frontMatter.signals,
        integrations: frontMatter.integrations,
        domains: frontMatter.domains,
        methods: frontMatter.methods,
      };
    });

  return (
    <Layout
      title={metadata.blogTitle}
      description={metadata.blogDescription}
    >
      <main>
        <UseCases useCases={useCases} />
      </main>
    </Layout>
  );
}
