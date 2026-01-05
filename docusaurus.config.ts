import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { githubA11yLight } from "./src/prismColorTheme";
import versions from "./versions.json";

import versionReplacer from './src/remark/version-replacer';

const latestVersionName = versions[0];

const config: Config = {
  title: "Inspektor Gadget",
  tagline:
    "tools and framework for data collection and system inspection on Kubernetes clusters and Linux hosts using eBPF",
  favicon: "media/brand-icon.svg",

  // Set the production url of your site here
  url: "https://www.inspektor-gadget.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    "docusaurus-lunr-search",
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          {
            from: "/docs",
            to: "/docs/latest"
          },
          {
            from: "/docs/latest/guides/run",
            to: "/docs/latest/reference/run"
          },
          {
            from: "/docs/latest/core-concepts/architecture",
            to: "/docs/latest/reference/architecture"
          },
          {
            from: "/docs/latest/getting-started/quick-start",
            to: "/docs/latest/quick-start"
          },
          {
            from: "/docs/latest/ig",
            to: "/docs/latest/reference/ig"
          },
          {
            from: "/docs/latest/getting-started/install-kubernetes",
            to: "/docs/latest/reference/install-kubernetes"
          },
          {
            from: "/docs/latest/getting-started/install-linux",
            to: "/docs/latest/reference/install-linux"
          },
        ],
        createRedirects(toPath) {
          if (toPath.includes("/docs/latest/gadgets/builtin")) {
            // Redirect to the new location of the builtin gadgets
            return toPath.replace("/docs/latest/gadgets/builtin", "/docs/latest/builtin-gadgets");
          }
          return undefined;
        }
      },
    ],
    [
      "@docusaurus/plugin-ideal-image",
      {
        quality: 70,
        max: 1030, // max resized image's size.
        min: 640, // min resized image's size. if original is lower, use that size.
        steps: 2, // the max number of images generated between min and max (inclusive)
        disableInDev: false,
      },
    ],
    function (context, options) {
      return {
        name: "webpack-configuration-plugin",
        configureWebpack(config, isServer, utils) {
          return {
            resolve: {
              symlinks: false,
            },
          };
        },
      };
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    format: "detect",
    mermaid: true,
  },

  presets: [
    [
      "classic",
      {
        docs: {
          remarkPlugins: [versionReplacer],
          lastVersion: "current",
          versions: {
            current: {
              label: "latest",
              path: "latest",
            },
            [latestVersionName]: {
              banner: "none",
            },
            main: {
              banner: "none",
            },
          },
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/inspektor-gadget/inspektor-gadget/edit/main/",
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "true",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Overpass+Mono:wght@300..700&family=Overpass:ital,wght@0,100..900;1,100..900&family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap",
      },
    },
  ],

  themeConfig: {
    image: "images/social-card.png",
    metadata: [
      { name: "og:url", content: "/" },
      { name: "og:site_name", content: "Inspektor Gadget" },
      { name: "og:image:width", content: "1200" },
      { name: "og:image:height", content: "600" },
    ],
    navbar: {
      logo: {
        alt: "Inspektor Gadget logo",
        src: "img/logo.svg",
        srcDark: "img/logo-white.svg",
        width: "103",
        height: "32",
      },
      items: [
        {
          position: "left",
          to: "/",
          label: "Home",
          activeBaseRegex: `^\/$`,
        },
        { to: "/blog", label: "Blog", position: "left" },
        {
          type: "docSidebar",
          sidebarId: "mainSidebar",
          position: "left",
          label: "Docs",
        },
        {
          type: "docsVersionDropdown",
          position: "right",
        },
        {
          href: "https://github.com/inspektor-gadget/inspektor-gadget",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      logo: {
        alt: "IG logo",
        src: "img/logo.svg",
        srcDark: "img/logo-white.svg",
        width: "155",
        height: "32",
      },
      links: [
        {
          title: "Community",
          items: [
            {
              label: "Contribute",
              href: "https://www.inspektor-gadget.io/docs/latest/devel/contributing/",
            },
            {
              label: "Github",
              href: "https://github.com/inspektor-gadget/inspektor-gadget",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} The Inspektor Gadget Contributors<br />
      The Linux Foundation® (TLF) has registered trademarks and uses trademarks.<br />
      For a list of TLF trademarks, see <a href="https://www.linuxfoundation.org/legal/trademark-usage" target="_blank">
      Trademark Usage</a>`,
    },
    prism: {
      additionalLanguages: ["bash", "yaml", "docker", "go"],
      theme: githubA11yLight,
      darkTheme: prismThemes.oceanicNext,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
