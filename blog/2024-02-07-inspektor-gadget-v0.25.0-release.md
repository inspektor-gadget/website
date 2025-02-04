---
authors: ["maya-singh"]
description: "Inspektor Gadget Release Highlights v0.25.0"
draft: false
tags: ["TC Programs", "kubernetes", "Inspektor Gadget"]
title: "Inspektor Gadget Release Highlights v0.25.0"
slug: /2024/02/inspektor-gadget-release-highlights-v0.25.0
image: /media/v0.25.0-post-image-unsplash.jpg
---

We're back with the highlights of another [Inspektor Gadget Release](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.25.0).

## This summary includes:

[Support for TC Programs](#support-for-tc-programs)

[Addition of the Upper Layer field](#addition-of-the-upper-layer-field-in-the-trace-exec-gadget)

[Default Registry for Image-based Gadgets](#default-registry-for-image-based-gadgets)

[Reducing Host Volume Mounts](#reducing-host-volume-mounts)

[Converting Built-in Gadgets to Image-based Gadgets](#converting-built-in-gadgets-to-image-based-gadgets)

[New Contributors](#new-contributors)

<!-- truncate -->

## Support for TC Programs

Inspektor Gadget now supports Traffic Control (TC) programs. TC programs can be used to inspect and modify the content of the network packets. Before this enhancement, Inspektor Gadget could only observe the system, now with the support of TC programs, it's possible to write gadgets that modify the network packets, like firewalls, Network Address Translations (NAT), etc.

## Addition of the Upper Layer field in the trace exec gadget

We have added the Upper_Layer field to the output of the trace exec gadget. This enables users to identify if a program was modified in the container. If the Upper_Layer field reads "TRUE" this indicates that the program being run does not come from the original container image but was modified. For additional technical context, OverlayFS performs a copy-up when a file is modified in a container and moves the modified file from the lower layer to the upper layer. You can read more about it in the [documentation](https://inspektor-gadget.io/docs/v0.25.0/builtin-gadgets/trace/exec/#overlay-filesystem-upper-layer).

## Default Registry for Image-based Gadgets

We have implemented a default registry for image-based gadgets making it even easier to use Inspektor Gadget. Before it was necessary to define the Github Container registry path that the gadgets are located in, now with the default registry change, you can simply run gadgets directly from the ig run command.

```yaml
Before: $ sudo -E  ig run ghcr.io/inspektor-gadget/gadget/trace_open:v0.25.0
After: $ sudo -E  ig run trace_open:v0.25.0
```

## Reducing Host Volume Mounts

In the spirit of Principle of Least Privilege, we reduced the quantity of folders from the host that we mount on the Inspektor Gadget pods. Now Inspektor Gadget only mounts what is really needed, and most of the volumes are mounted as read-only. These mounts are needed because Inspektor Gadget needs some visibility into the host root file system to be able to trace processes.

## Converting Built-in Gadgets to Image-based Gadgets

We continue our work to convert built-in gadgets to image-based gadgets. In this release we converted the trace oomkill and trace sni built-in gadgets into image-based gadgets.

## New Contributors

Shout out to first-time contributors @ghinks and @prwarpranav83!

The full release notes can be found here: [Release v0.25.0 · inspektor-gadget/inspektor-gadget (github.com)](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.25.0)

As always, we look forward to hearing your feedback and connecting with you on Slack! [#inspektor-gadget](https://kubernetes.slack.com/messages/inspektor-gadget/) in the Kubernetes workspace.
