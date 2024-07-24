---
authors: ["mauricio-vasquez"]
description: "What's new in Inspektor Gadget v0.5.0?"
draft: false
tags: ["eBPF", "bpf", "inspektor gadget", "bcc"]
title: "What's new in Inspektor Gadget v0.5.0?"
slug: /2022/06/whats-new-in-inspektor-gadget-v0.5.0
image: /media/ig-v0.5.0-banner.jpg
---

We released Inspektor Gadget v0.5.0 some days ago. This release took
some months of work, and it is by far our biggest release ever. In this
blog post we go through the new features and relevant changes in this
version.

# Better gadgets categorization

We reorganized the kubectl-gadget CLI, grouping the different gadgets
into categories. The motivation for this change is as follows.

- **Improved user experience** : Categorizing gadgets provides a marked
  improvement over the previous large list of gadgets, that was
  confusing as to what each gadget does and how it relates to other
  gadgets.
- **Consistency across similar gadgets** : All gadgets in a category
  should have the same interface and behavior. Once you learn to use one
  gadget in a category, there should be no additional effort to use
  other gadgets in the same category.
- **Encouraging discovery** : By clearly communicating usage and making
  interfaces and behavior consistent, the barrier to exploring other
  gadgets should be reduced and doing so encouraged.
- **Future expansion** : We have lots of ideas for new gadgets and
  use-cases. This new structure allows the project to grow in a clear
  and consistent way.

The following categories have been introduced. Please note that all
names and categories are preliminary. Your input is welcome as we look
to stabilize these moving forward.

### [advise](https://kinvolk.io/docs/inspektor-gadget/latest/guides/advise/)

The advise gadgets suggest different system configurations by capturing
and analyzing data from the host. For instance, the `advise
seccomp-profile` gadget captures the different system calls performed by
a container and suggests a seccomp profile for it. The `advise
network-policy` gadget works in a very similar way, it captures network
connections and suggests a Kubernetes network policy to apply.

### [audit](https://kinvolk.io/docs/inspektor-gadget/latest/guides/audit/)

This audit gadgets help to audit specific functionalities or security
settings. For now, we only have the `audit seccomp` gadget. Other auditing
gadgets will follow in the future.

### [profile](https://kinvolk.io/docs/inspektor-gadget/latest/guides/profile/)

The profile gadgets provide a way to measure the performance of a
sub-system. These gadgets capture system events for a period and then
print a report. With this release we have two gadgets in this category,
`profile block-io` and `profile cpu`.

### [snapshot](https://kinvolk.io/docs/inspektor-gadget/latest/guides/snapshot/)

The snapshot gadgets capture and print the status of a system at a
specific point in time. In this category, we have the `snapshot socket`
and `snapshot process` gadgets.

### [top](https://kinvolk.io/docs/inspektor-gadget/latest/guides/top/)

The top gadgets show the current activity sorted by the highest to the
lowest in the resource being observed, generating the output every few
seconds. This category is composed of three gadgets: `top block-io`, `top
file` and `top tcp`.

### [trace](https://kinvolk.io/docs/inspektor-gadget/latest/guides/trace/)

The gadgets in the trace category capture and print system events. All
previous "snoop" gadgets fall into this category, for instance execsnoop
is now invoked as `trace exec`, opensnoop as `trace open` and so on.

# New Gadgets

This new Inspektor Gadget version includes a bunch of new gadgets.

### audit

We introduced a new secomp gadget to this category.

#### seccomp

The `audit seccomp` gadget allows us to see the syscalls that are being
blocked by a seccomp profile. Please follow this
[guide](https://kinvolk.io/docs/inspektor-gadget/latest/guides/audit/seccomp.md)
to get more details about it.

### trace

We added multiple gadgets to this category:

#### signal

This gadget traces signals sent in the system and can help identify
what's killing a process or surface when they are dying due to a
segmentation fault. This
[guide](https://kinvolk.io/docs/inspektor-gadget/latest/guides/trace/signal.md)
has an example of how this can be used.

#### oomkill

This gadget allows us to understand when a process is killed by the oom
killer. Please check this
[guide](https://kinvolk.io/docs/inspektor-gadget/latest/guides/trace/oomkill.md)
to get all the details about it.

#### sni

The sni gadget is used to trace the [Server Name Indication
(SNI)](https://en.wikipedia.org/wiki/Server_Name_Indication) requests
sent as part of TLS handshakes. This
[guide](https://kinvolk.io/docs/inspektor-gadget/latest/guides/trace/sni.md)
contains an example of how to use it.

#### fsslower

The fsslower gadget can be used to list I/O operations that take longer
than a given threshold. Please follow the
[guide](https://kinvolk.io/docs/inspektor-gadget/latest/guides/trace/fsslower.md)
to get more information about its usage.

### top

We added a new file gadget to this category.

#### file

`top file` shows a list of files with the highest read/write operations.
Check out its
[guide](https://kinvolk.io/docs/inspektor-gadget/latest/guides/top/file.md)
to get more insights.

# Move Inspektor Gadget to its own namespace and use RBAC

Before this release, we were deploying the Inspektor Gadget DaemonSet to
the kube-system namespace. This approach was rather intrusive, so we
moved it to a different namespace. Starting from this version, Inspektor
Gadget is deployed to its own gadget namespace, and we used RBAC
policies to give it access only to the resources it needs.

This change can cause some problems if Inspektor Gadget v0.5.0 is
deployed on the cluster without removing a previous installation. Please
be sure to remove Inspektor Gadget from the cluster before installing a
new version, this can be done by running `kubectl gadget deploy |
kubectl delete -f -` if you have kubectl-gadget < v0.5.0 or using
`kubectl gadget undeploy` if you have a version >= v0.5.0.

# Implement the gadgets control plane in Golang

Many of the Inspektor Gadget gadgets are based on BCC tools. Our initial
approach was to execute those tools directly from Inspektor Gadget,
parsing their output. This approach had many complications: the size of
the container image is big because there are many binaries, we need to
parse the output of tools that can change with newer versions, and we
need to maintain a BCC fork with some customizations.

Given all those challenges, we decided to try a different solution:
implement the user space part (control plane) of those gadgets directly
in Golang. We use the cilium/ebpf library to handle the eBPF objects and
rely on CO-RE (and BTFGen) to run on different kernel versions.

This has also allowed us to more easily improve consistency across
gadgets; unifying the behavior of many of our gadgets that were subtly
different before.

# How to Update

The first thing to be done is to remove the old version from the cluster:

```bash
kubectl gadget deploy | kubectl delete -f -
```

Then, update the kubectl-gadget plugin. If you are using krew, run
`kubectl krew upgrade gadget` to update it, otherwise download the file
for your platform from the release assets and copy it to a location
where it can be found by kubectl. For instance, if you are running Linux
on an amd64 machine:

```bash
wget https://github.com/inspektor-gadget/inspektor-gadget/releases/download/v0.5.0/kubectl-gadget-linux-amd64.tar.gz
tar xfz kubectl-gadget-linux-amd64.tar.gz
sudo cp kubectl-gadget /usr/local/bin/kubectl-gadget
```

You can now deploy the new version to the cluster:

```bash
kubectl gadget deploy | kubectl apply -f -
```

Please check the [release
notes](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.5.0)
of the v0.5.0 release to get a detailed list of the changes introduced
in this version.
