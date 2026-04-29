---
authors: ["brian-benz", "francis-laniel"]
title: "Results from the First Inspektor Gadget Security Audit"
description: "Inspektor Gadget completed its first independent security audit, conducted by Shielder and coordinated by OSTIF. The audit found three vulnerabilities — all now fixed — plus six hardening recommendations. Here's what was found and what it means for the project."
draft: false
tags: ["inspektor-gadget", "security", "audit", "eBPF", "CNCF", "OSTIF"]
slug: /2026/04/inspektor-gadget-security-audit
image: /media/security-audit.png
---

[Inspektor Gadget](https://github.com/inspektor-gadget/inspektor-gadget) has completed its first independent security audit, conducted by [Shielder](https://www.shielder.com/) and coordinated by [OSTIF](https://ostif.org). The audit found three vulnerabilities — all now fixed in [v0.51.1](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.51.1) — plus six hardening recommendations and six gadget bypass scenarios. This post walks through the scope, findings, and what they mean for users.

<!-- truncate -->

## Why a Security Audit?

Inspektor Gadget runs with root-level access on nodes to collect eBPF-based observability data. Any tool with that level of privilege needs to earn trust. An independent security review is one of the best ways to do that — and a critical milestone for any CNCF project moving toward broader adoption.

OSTIF, a nonprofit dedicated to improving the security of open source software, coordinated the engagement and selected [Shielder](https://www.shielder.com/) to perform the assessment.

## How the Audit Was Scoped

Two Shielder researchers worked on the audit in early 2026. Their methodology combined:

- **Collaborative threat modeling** with Inspektor Gadget maintainers
- **Manual source code review**
- **Dynamic testing** on three dedicated lab environments: a local Linux host, a remote daemon deployment, and a Kubernetes deployment on minikube
- **Static analysis** using Semgrep and GoSec
- **AI-assisted code review** for broader coverage

## What the Audit Found

The audit identified **three vulnerabilities**. None were rated Critical or High severity.

### Two Medium Severity Findings

1. **Command Injection in `ig image build`** ([CVE-2026-24905](https://github.com/inspektor-gadget/inspektor-gadget/security/advisories)) — The image build process used Makefiles that embedded user-controlled input without proper escaping, creating a command injection vector. Fixed in **v0.51.1**.

2. **Denial of Service via Event Flooding** ([CVE-2026-31890](https://github.com/inspektor-gadget/inspektor-gadget/security/advisories)) — A malicious container could flood the eBPF ring buffer (hard-coded to 256 KB), causing the system to silently drop events from other containers. Fixed in **v0.50.1**.

### One Low Severity Finding

3. **Unsanitized ANSI Escape Sequences in columns output mode** ([CVE-2026-25996](https://github.com/inspektor-gadget/inspektor-gadget/security/advisories)) — When rendering events in the terminal, Inspektor Gadget didn't sanitize ANSI escape sequences, which could be exploited for terminal injection. Fixed in **v0.49.1**.

**All three vulnerabilities are now fixed.** Release [v0.51.1](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.51.1) includes patches for all of them.

## Hardening Recommendations

Beyond the specific vulnerabilities, Shielder delivered six hardening recommendations — areas where the project can reduce its attack surface over time:

- **Enforce TLS by default on TCP listeners.** When the daemon starts a TCP listener without TLS, it currently logs a warning and continues in plaintext. We are currently addressing this in [PR #5484](https://github.com/inspektor-gadget/inspektor-gadget/pull/5484).
- **Pin and verify external dependencies in CI/CD.** Several build dependencies were downloaded without hash or signature verification. Fixes have already landed for [actionlint](https://github.com/inspektor-gadget/inspektor-gadget/pull/5357), [vimto](https://github.com/inspektor-gadget/inspektor-gadget/pull/5473), and [bpftool](https://github.com/inspektor-gadget/inspektor-gadget/pull/5472).
- **Implement a Kubernetes namespace blocklist** to prevent unintended tracing on sensitive namespaces such as `kube-system`.
- **Restrict remote clients from enabling host-level tracing** through the daemon, or clearly document the risk.
- **Automate third-party vulnerability scanning** for project dependencies. This was addressed via a [dependabot fix](https://github.com/inspektor-gadget/inspektor-gadget/pull/5363).
- **Reduce RBAC permissions** on the DaemonSet pod — specifically the `nodes/proxy` GET permission, which could be leveraged for privilege escalation if the service account token is compromised. Addressed in [PR #5343](https://github.com/inspektor-gadget/inspektor-gadget/pull/5343).

We are working through these systematically. Some are already merged; others — notably the namespace blocklist and further RBAC refactoring — will take more time.

## Gadget Bypass Testing

One of the most technically interesting parts of the audit was the gadget bypass testing. The researchers asked: **can a compromised container perform operations that a gadget is meant to trace, without the gadget detecting it?**

Six bypass scenarios were identified:

- `trace_open` does not trace `openat2()`: Fix available in [PR #5399](https://github.com/inspektor-gadget/inspektor-gadget/pull/5399).
- `trace_mount` does not trace filesystem related operations like `fsmount()` and `move_mount()`.
- `tcpdump` does not trace Jumbo Frames.
- `trace_sni` does not trace IPv6.
- `trace_malloc`, `trace_ssl` and uprobes-based gadgets cannot trace statically compiled binaries: Addressing via [documentation updates](https://github.com/inspektor-gadget/inspektor-gadget/pull/5426).
- `trace_open` and other gadgets tracing I/O cannot trace I/O performed through `io_uring`: Addressing via [documentation updates](https://github.com/inspektor-gadget/inspektor-gadget/pull/5426).

These results reflect the cat-and-mouse nature of kernel-level tracing. Linux keeps evolving — new syscalls and subsystems keep appearing — and eBPF-based tracing tools have to keep up. We are treating these findings as an ongoing roadmap item.

## What This Means for Users

**If you're running Inspektor Gadget in production, update to [v0.51.1](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.51.1) or later.** This release includes fixes for all three reported vulnerabilities.

Beyond that, the audit confirmed that Inspektor Gadget's core architecture is sound. No Critical or High severity issues were found, and the hardening recommendations point to defense-in-depth improvements rather than fundamental design flaws.

For the wider cloud native community, this audit is an example of how the ecosystem is supposed to work: a project reaches a level of adoption where independent security review becomes necessary, OSTIF coordinates the engagement, a qualified firm does the work, and the results are disclosed transparently.

The full audit report can be found [here](https://github.com/ShielderSec/public-reports/blob/main/2026/%5BOSTIF%5D%20Inspektor%20Gadget%20-%20Report%20v1.2.pdf).
