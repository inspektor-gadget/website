# Inspektor Gadget's website

## Requirements

Node, npm, python3

## Documentation preview

To preview your edits to docs in the inspektor-gadget repo run

```bash
npm run dev
```

This will link docs from the `../inspektor-gadget` folder.
To link docs from other location use `IG_DOCS` env variable

```bash
IG_DOCS=some/place/inspektor-gadget/docs npm run dev
```

## Adding a new blog post

Create a new markdown file in `docs/`.
Some frontmatter properties:

- `slug` by convention all blog post paths are /YYYY/MM/title
- `image` you can use image from /static/ folder or relative path

[All possible frontmatter propeties](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-blog#markdown-front-matter)

**IMPORTANT**  
Please remember to include `<!--truncate-->` after the first paragraph.  
This will mark what will be shown as the preview in the "Latest" section in the blog.

[Markdown features docs](https://docusaurus.io/docs/markdown-features)
