---
authors: ["qasim-sarfraz"]
title: "Deep Kubernetes Troubleshooting with HolmesGPT and Inspektor Gadget"
description: "HolmesGPT now integrates Inspektor Gadget's eBPF-based observability tools, giving its AI agent the ability to capture live system data — processes, sockets, DNS, TCP connections, syscalls, and network packets — directly from Kubernetes nodes during investigations."
draft: false
tags: ["inspektor-gadget", "holmesgpt", "kubernetes", "eBPF", "troubleshooting", "observability", "AI"]
slug: /2026/03/inspektor-gadget-holmesgpt
image: /media/ig_holmesgpt.png
---

Troubleshooting production incidents in Kubernetes is hard. Logs and metrics tell you *what* happened, but not always *why*. Sometimes you need to look deeper — at which processes are running, what files are being opened, which DNS queries are failing, or what TCP connections are being made. That's the kind of low-level visibility that [Inspektor Gadget](https://inspektor-gadget.io) provides using eBPF.

Now, with a [new integration](https://github.com/HolmesGPT/holmesgpt/pull/1506), [HolmesGPT](https://holmesgpt.dev/) — a CNCF Sandbox project for AI-powered incident investigation — can use Inspektor Gadget's eBPF gadgets as part of its troubleshooting workflow.

<!-- truncate -->

## See It in Action

Instead of learning troubleshooting commands, you can now ask HolmesGPT directly:

```bash
holmes ask "Capture network traffic for the order-service pod and summarize the activity"
```

Behind the scenes, HolmesGPT runs [Inspektor Gadget's tcpdump gadget](https://inspektor-gadget.io/blog/2025/12/tcpdump), parses the results and summarizes the next steps:

![tcpdump gadget output](/media/tcpdump-output.png)

:::tip
Gadgets are invoked via `kubectl debug` and are ephemeral pods. No DaemonSet installation required. HolmesGPT handles the complexity of running gadgets on the right nodes with the right filters.
:::

## What Does the Integration Add?

The Inspektor Gadget toolset gives HolmesGPT access to **eight tools** running at the node level via `kubectl debug`:

| Tool | Purpose |
|------|---------|
| `trace_dns` | DNS queries and responses |
| `trace_tcp` | TCP connections (connect, accept, close) |
| `tcpdump` | Network packet capture with filters |
| `trace_exec` | Process execution events |
| `trace_open` | File open events |
| `snapshot_process` | Running processes on a node |
| `snapshot_socket` | Open sockets on a node |
| `traceloop` | System calls (flight recorder) |

## Enabling the Integration

Assuming you have [HolmesGPT](https://holmesgpt.dev/) installed and configured, you can enable the Inspektor Gadget toolset with a single environment variable:

```bash
export ENABLE_INSPEKTOR_GADGET=true
```

Verify the toolset is loaded:

```bash
holmes toolset list
```

Trace DNS for a pod:

```bash
holmes ask "Trace DNS for the payments pod in the production namespace for 30 seconds and summarize the results"
```

:::tip
Please refer to HolmesGPT's documentation for [installation instructions](https://holmesgpt.dev/latest/installation/cli-installation/) and [Inspektor Gadget toolset details](https://holmesgpt.dev/latest/data-sources/builtin-toolsets/inspektor-gadget/).
:::

## What's Next

This initial integration covers **node-level** gadgets using `kubectl debug`. Future work includes:

- **Cluster-level toolset** using [`kubectl gadget`](https://inspektor-gadget.io/docs/latest/reference/run) for broader cluster-wide observability
- **More gadgets** — network policies, capabilities, OOM kills, and more

Give it a try and let us know what you think! We'd love to hear your feedback and ideas for new gadgets to integrate.

Special thanks to the HolmesGPT maintainers for their reviews and feedback on this integration.

## Get Involved

- **HolmesGPT**: [GitHub](https://github.com/HolmesGPT/holmesgpt) · [Docs](https://holmesgpt.dev) · [CNCF Slack #holmesgpt](https://cloud-native.slack.com/archives/C0A1SPQM5PZ)
- **Inspektor Gadget**: [GitHub](https://github.com/inspektor-gadget/inspektor-gadget) · [Docs](https://inspektor-gadget.io/docs/latest/) · [CNCF Slack #inspektor-gadget](https://kubernetes.slack.com/messages/inspektor-gadget/)

Both projects are CNCF Sandbox projects and welcome contributions — whether that's new toolsets, gadgets, runbooks, or documentation.
