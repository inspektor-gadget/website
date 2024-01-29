+++
authors = ["maya-singh"]
date = "2024-01-29T10:00:00+02:00"
description = "Inspektor Gadget Release Highlights v0.24.0"
draft = false
tags = ["fentry", "fexit", "eBPF map", "kubernetes", "Inspektor Gadget"]
title = "Inspektor Gadget Release Highlights v0.24.0"
postImage = "v0.24.0 release post image-unsplash.jpg"
+++



We’re excited to share the highlights of the most recent [Inspektor Gadget release](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.24.0)\.

  

  

This summary includes:

  

  

[Ig image remove](#ig-image-remove)

  

  

[Enums to strings](#enums-to-strings)

  

  

[eBPF map logic](#ebpf-map-logic)

  

  

[Support of fentry, fexit, raw\_tracepoint](#support-of-fentry-fexit-raw\_tracepoint)

  


# Ig image remove

  

  

The *ig image remove* command was added which enables users to remove image based gadgets from their local storage\. It leverages the upstream project Oras, which [we contributed to](https://github.com/oras-project/oras-go/pull/647) in order to enable the “remove” functionality\.

  

  

# Enums to strings

  

  

As a part of converting built\-in gadgets to image\-based gadgets, we can now print enums as strings\. This makes interpreting the data from the gadget output much easier and it is no longer required for users to convert raw numbers to their string equivalents\. Check out the example below:

  

{{< figure src="/media/enumstostring.png" class="img-fluid" alt="Image showing the enums to string as described above.">}}

  
  

  

# eBPF map logic

  

  

Inspektor Gadget now includes logic to detect which kind of eBPF map is being used to send events to the userspace \(perf ring buffer or eBPF ring buffer\)\. Gadget authors can write gadgets using the new API and IG will automatically default to the best option available depending on the Linux kernel in which the gadget is being used\. Authors no longer need to worry about which version of Linux a gadget is being used in, this feature enables an optimal implementation\. Check out the updated documentation found [here](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/docs/reference/gadget-helper-api.md)\. This functionality is inspired by [similar work in the BCC project](https://github.com/iovisor/bcc/pull/4262)\.

  

  

# Support of fentry, fexit, raw\_tracepoint

  

  

In Linux there are many types of eBPF programs, we now support fentry, fexit and raw\_tracepoint programs, which expands the opportunity to write additional tracing gadgets\.

  

  

The full release notes can be found here: [ Release v0\.24\.0 · inspektor\-gadget/inspektor\-gadget · GitHub](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.24.0)

  

  

As always, we look forward to hearing your feedback and connecting with you on Slack\!  \#inspektor\-gadget in the Kubernetes workspace\.
