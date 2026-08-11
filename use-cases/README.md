# Adding a use case

Use cases are standalone MDX articles stored in this directory. Docusaurus
automatically publishes them under `/use-cases/<slug>` and adds them to the
searchable, faceted index at `/use-cases`.

Do not edit or remove `placeholder.mdx`. It is filtered out of the collection
page and only keeps the route available while there are no published use cases.

## Create the article

Create a descriptive kebab-case file such as:

```text
use-cases/debug-example-problem.mdx
```

Start with this front matter:

```yaml
---
title: Debug an example problem
description: Explain the user-visible problem and the outcome this workflow provides.
slug: debug-example-problem
date: 2026-08-10
gadget: example_gadget
icon: globe
platforms: [kubernetes, linux]
signals: [events]
integrations: [cli, opentelemetry]
domains: [networking, reliability]
methods: [trace]
image: /media/example-image.jpg
tags: [Kubernetes, Networking, Troubleshooting]
---
```

The `description` is displayed on the index card. Keep it short and focused on
the problem being solved.

The `image` must refer to a file under `static/`. Add new images to
`static/media/` and reference them as `/media/<filename>`.

## Supported filter values

Use only these controlled values. Values are lowercase and arrays may contain
more than one value.

| Field | Values |
| --- | --- |
| `platforms` | `kubernetes`, `linux` |
| `signals` | `events`, `metrics`, `profiles` |
| `integrations` | `cli`, `opentelemetry`, `prometheus`, `pyroscope` |
| `domains` | `networking`, `performance`, `security`, `reliability` |
| `methods` | `trace`, `profile`, `top`, `audit`, `advise` |
| `icon` | `globe`, `memory`, `bolt`, `hard-drive`, `route`, `file-shield` |

Select only values that the article actually demonstrates. The index combines
multiple selections within one filter with OR, and combines different filters
with AND.

## Write the content

Structure the article around the user's goal rather than the Gadget reference:

1. Describe the symptom and why existing signals are insufficient.
2. Explain when the workflow is appropriate.
3. Provide the minimal commands needed to investigate.
4. Explain how to interpret the output and decide what to do next.
5. Link to detailed Gadget documentation as supporting reference.

Add `<!-- truncate -->` after the introduction. This keeps previews concise on
generated tag pages.

Example outline:

```mdx
Explain the problem and how Inspektor Gadget helps.

<!-- truncate -->

## When to use this workflow

Describe the relevant symptoms.

## Investigate

Provide focused commands and expected signals.

## Interpret the result

Explain how the evidence narrows the diagnosis.

## Related documentation

Link to the relevant Gadget and export documentation.
```

## Preview the result

Run:

```bash
npm run build
npm run serve
```

Check the index at `/use-cases`, test each applicable filter, and open the
article to verify its image, headings, links, and code blocks.
