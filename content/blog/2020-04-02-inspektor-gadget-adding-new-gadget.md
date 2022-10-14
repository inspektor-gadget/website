+++
authors = ["Alban Crequy"]
date = "2020-04-02T08:00:00+02:00"
description = "Adding new BCC-based gadgets in Inspektor Gadget"
draft = false
tags = ["kubernetes", "inspektor-gadget", "bpf", "bcc"]
title = "Adding new BCC-based gadgets in Inspektor Gadget"
topics = ["containers", "security"]
postImage = "rana-sawalha-W_-6PWGbYaU-unsplash-1600.jpg"
+++

When asked for a good source to learn how to write BPF code I send people to the BPF
Compiler Collection (BCC) project - https://github.com/iovisor/bcc. In addition to a
C/C++ library for BPF and bindings in Python and LUA, it contains various
tracing tools with clear examples of how to use them. It’s useful to read the
source of those tools to learn the coding patterns with BPF.

A number of the gadgets in Inspektor Gadget such as
[execsnoop](https://github.com/inspektor-gadget/inspektor-gadget/blob/master/Documentation/demo-execsnoop.md)
and
[opensnoop](https://github.com/inspektor-gadget/inspektor-gadget/blob/master/Documentation/demo-opensnoop.md)
are directly based on BCC tools
[execsnoop](https://github.com/iovisor/bcc/blob/master/tools/execsnoop_example.txt)
and
[opensnoop](https://github.com/iovisor/bcc/blob/master/tools/opensnoop_example.txt)
without modifications. In this case, Inspektor Gadget provides the high-level
kubectl-like user experience: users don’t have to install BCC on the nodes, no
need to ssh into the nodes, and they can use high level concepts like Kubernetes
labels to filter the traces.

Last month, BCC gained a new tracing tool:
[bindsnoop](https://github.com/iovisor/bcc/pull/2749). It traces the kernel
function performing socket binding. It allows users, for example, to see that
nginx binds on TCP port 80. Thus, we wanted to integrate bindsnoop into a
Inspektor Gadget gadget in order to help debug why connections might fail.  In
order to make integrating new BCC tools into Inspektor Gadget, we introduced a
new `--cgroupmap` option into BCC that allows for filtering by
[cgroups](https://github.com/iovisor/bcc/blob/master/docs/filtering_by_cgroups.md).
With this change, BCC tools can be integrated seamlessly into Inspektor Gadget.
Indeed, bindsnoop was integrated with only [a few lines of
code](https://github.com/inspektor-gadget/inspektor-gadget/pull/35/files#diff-f616fa5f11da59a9ae7344d196bbf357R40-R43).

## How it works

The Gadget Tracer Manager is a daemon deployed as a DaemonSet that keeps track
of the gadgets currently running in Inspektor Gadget (such as bindsnoop or
execsnoop) and the containers running on each node. When the user starts
a new instance of gadget like bindsnoop, the Gadget Tracer Manager
populates a BPF map with the set of cgroup ids of containers that should be
traced by that gadget.

<div aria-hidden="true">
Here is a simple diagram illustrating it:

{{< figure src="/media/gadget-tracer-manager.png" class="float-left pr-2">}}
</div>

## Conclusion

It’s become easier to add new gadgets in Inspektor Gadget thanks to BCC.  As an
Open Source project, contributions are welcome. Join the discussions on the
[#inspektor-gadget](https://kubernetes.slack.com/messages/inspektor-gadget/)
channel in the Kubernetes Slack or, if you want to know about our services
related to BPF and Kubernetes, reach us at
[hello@kinvolk.io](mailto:hello@kinvolk.io).
