---
authors: [tianyi-liu]
description: "Supporting Uprobe based gadgets - LFX Mentorship Report"
draft: false
tags:
  [
    "LFX Mentorship",
    "Uprobe",
    "USDT",
    "LSM",
    "Stack Unwinding",
    "Inspektor Gadget",
    "gadget",
  ]
title: "Supporting Uprobe based gadgets - LFX Mentorship Report"
slug: /2024/06/supporting-uprobe-based-gadgets-lfx-mentorship-report
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

My name is Tianyi Liu. As a mentee in the [LFX Mentorship program](https://mentorship.lfx.linuxfoundation.org/project/f016029e-f15f-4ee9-aaf5-5719bee72b59) for the 2024 Spring term, I contributed to the Inspektor Gadget project under the mentoring of [Alban Crequy](https://github.com/alban) and [Mauricio Vásquez Bernal](https://github.com/mauriciovasquezbernal).
During the work, [Francis Laniel](https://github.com/eiffel-fl), [Michael Friese](https://github.com/flyth) and many people in the Inspektor Gadget community also helped me a lot.
As the project comes to an end, I am writing this report to summarize my work over the past three months and to introduce the new features with technical details.

<!-- truncate -->

# Supporting Uprobe

[Uprobe](https://lwn.net/Articles/499190/) is a commonly used type of `perf_events` in Linux.
Performance engineers and security professionals often attach eBPF programs to uprobe tracepoints to monitor the behavior of applications.
So supporting uprobe could enable Inspektor Gadget to be applied in a wider range of scenarios.

Since the [`cilium/ebpf`](https://github.com/cilium/ebpf/) library that Inspektor Gadget depends on already provides necessary support,
[adding basic uprobe support](https://github.com/inspektor-gadget/inspektor-gadget/pull/2580) does not require much work.
Because uprobes need to be attached to ELF files, we use [`/proc/<PID>/root/`](https://blog.px.dev/container-filesystems/#how-we-use-this-at-pixie) to access the container's filesystem.

Apart from this, we also need to automatically attach uprobes when container starts and detach them when container stops.
Inspektor Gadget [intercepts runc](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/pkg/runcfanotify/runcfanotify.go) during container startup and triggers the `AttachContainer` event.
When a container stops, the `DetachContainer` event will be triggered in each tracer, greatly simplifying our task.
Due to the increased complexity of this functionality, we introduced a new package [`uprobetracer`](https://github.com/inspektor-gadget/inspektor-gadget/pull/2634) to support automatic attaching and detaching.

However, we encountered a tricky issue.
If multiple containers share the same image (or using Volumes to access files on host), the same file (inode) might be shared across multiple containers.
On the other hand, when we attach a uprobe to a file, all processes using that file will trigger events.
For instance, if we try to attach to the `libc:malloc` function in N containers, and the `libc.so.6` libraries in these containers share the same inode, we would receive N times the events.
To solve this problem, we need to distinguish whether files in different containers use the same inode, which is not an easy task.
We discovered that starting from Linux 6.6, overlayFS [randomly modifies the filesystem ID](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=b0504bfe1b8acdcfb5ef466581d930835ef3c49e) of files in the merged directory, making the approach using `<fsid, inode>` pairs as identifiers unusable.
After extensive research, we finally used [`pkg/kfilefields`](https://github.com/inspektor-gadget/inspektor-gadget/pull/2669) to read the address of the inode structure from the kernel and use it as a unique identifier for files.

# User-Level Statically Defined Tracepoints (USDT)

USDT tracepoints are a technique for dynamically tracing and debugging applications, allowing developers to insert statically defined tracepoints at specific locations in the program.
These tracepoints can be dynamically enabled or disabled at runtime and can pass parameters.
[Many projects](https://www.brendangregg.com/blog/2016-10-12/linux-bcc-nodejs-usdt.html) support USDT tracepoints to enhance observability for external profilers.
SystemTap provides [macros](https://github.com/jav/systemtap/blob/master/includes/sys/sdt.h#L253) to define USDT tracepoints, and the tracepoint information is stored in some special sections during compilation.
Details of the formats could be found in this [document](https://sourceware.org/systemtap/wiki/UserSpaceProbeImplementation).

We use a [parser](https://github.com/inspektor-gadget/inspektor-gadget/pull/2765) to read the information from these sections, obtaining the name, provider, breakpoint address, and parameter information for each USDT tracepoint.
Because the way to get USDT parameters at runtime could be complex, `BCC` handles these parameters by dynamically [generating source code](https://github.com/iovisor/bcc/commit/4ea4af45c0ef09ce02f93cc8d0947fb20a5faf7e).
However, since Inspektor Gadget uses precompiled eBPF code and does not include a compiler toolchain, we cannot dynamically rewrite gadgets to support USDT.

To address this, we designed a protocol to encode USDT information, which is then parsed and executed on the eBPF side.
To reduce the complexity introduced by new interfaces, we encapsulated the eBPF-side executor as an [eBPF extension](https://lore.kernel.org/bpf/20200121005348.2769920-2-ast@kernel.org/) and distributed it with Inspektor Gadget.
This approach solves potential backward compatibility issues when updating the protocol.

# Porting Uprobe based gadgets

We ported several uprobe-based gadgets from [BCC](https://github.com/iovisor/bcc/tree/master/tools) and [bpftrace](https://github.com/bpftrace/bpftrace/tree/master/tools) to fully utilize uprobes.
The [`trace_malloc`](https://artifacthub.io/packages/inspektor-gadget/gadgets/trace-malloc) gadget can trace memory allocation and deallocation in both userspace and kernel space, it will also support detecting memory leaks in the future.
The [`trace_ssl`](https://artifacthub.io/packages/inspektor-gadget/gadgets/trace-ssl) gadget can be used to show encrypted network traffic and latency by attaching to functions in OpenSSL, GnuTLS, NSS, and libcrypto.
The [`trace_gc`](https://github.com/inspektor-gadget/inspektor-gadget/pull/2765) gadget can track garbage collection activities in Python and Java, recording the timestamp, latency, and memory pressure during each garbage collection event.
This could help programmers attribute jitter in production environments.

# Tracing with Linux Security Modules

We also added support for LSM tracepoints.
These tracepoints are distributed along critical paths in the Linux kernel and offer a stable API across different kernel versions.
Gadgets related to security auditing can use this feature to deny certain sensitive operations without terminating the entire process.
As a demo, we provided a strace-like gadget, [`trace_lsm`](https://github.com/inspektor-gadget/inspektor-gadget/tree/main/gadgets/trace_lsm), to trace available LSM events.
You can find the complete list of LSM tracepoints in [`lsm_hook_defs.h`](https://elixir.bootlin.com/linux/latest/source/include/linux/lsm_hook_defs.h).

# Supporting kernel stack maps

The new `gadget_kernel_stack` type is now available in the event structure.
By assigning it the return value of the `gadget_get_kernel_stack` helper function, IG frontend can automatically resolve and show kernel stacks.
We have implemented a [field converter](https://github.com/inspektor-gadget/inspektor-gadget/pull/2671) to achieve this.

# Open Issues

## Unwinding user stacks

Unwinding user stacks has always been a challenging problem.
The Linux [`bpf_get_stackid`](https://man7.org/linux/man-pages/man7/bpf-helpers.7.html) helper function only supports unwinding the stack using the frame pointers.
However, since this approach incurs around a 2% performance overhead, many applications are not compiled with `fno-omit-frame-pointer`, making it difficult to unwind user stacks as easily as kernel stacks.
For JIT-based or interpreted languages like Java, enabling stack unwinding typically requires enabling costly debugging flags or loading agents.

Recent projects like [`otel-profiling-agent`](https://github.com/elastic/otel-profiling-agent?tab=readme-ov-file#stack-unwinding) and [`parca-agent`](https://github.com/parca-dev/parca-agent/blob/main/docs/native-stack-walking/design.md) use the info in `.eh_frame` sections to unwind stacks for C/C++/Rust languages.
We attempted a similar implementation but found that even native program stacks are more complex than anticipated.
Besides the usual `.eh_frame`, we also need to handle signal stacks, VDSO calls, PLT tables, and other scenarios, making the maintenance challenging.

Currently, we are [exploring](https://github.com/elastic/otel-profiling-agent/issues/33) integrating one of these two projects into Inspektor Gadget.
By using a BPF tail call to invoke their entry points and leveraging RPC to obtain stack information, we can benefit from their support for additional languages like Java, Python, and PHP.

# Conclusion

I gained a lot from my journey in the LFX Mentorship program with Inspektor Gadget.
During the three-month period, I became familiar with the use cases and technical details of the Inspektor Gadget project, accumulated extensive experience with eBPF, and did exciting work on an independent module.
Throughout this mentorship, I often discussed design and technical details with my mentors, which greatly expanded my horizons.
We delved into the Linux source code and pioneered solutions to many challenging problems.
I not only received enthusiastic guidance from my mentors but also had the opportunity to connect with many others in the CNCF community.
I plan to stay involved in the Inspektor Gadget community after the mentorship and continue creating value for more users.
