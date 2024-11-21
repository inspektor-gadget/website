---
authors: [ "qasim-sarfraz" ]
description: "Debugging DNS with Inspektor Gadget"
draft: false
tags:
  [
    "DNS",
    "CoreDNS",
    "Hubble",
    "kubernetes",
    "Inspektor Gadget",
  ]
title: "Debugging DNS with Inspektor Gadget"
slug: /2024/11/inspektor-gadget-dns
image: /media/2024-11-21-inspektor-gadget-dns.jpg
---

DNS is a critical component of any Kubernetes cluster, and debugging DNS issues can be challenging. In order to
effectively troubleshoot DNS-related problems, it is essential to understand how DNS requests flow through the cluster.
The typical components involved in handling DNS requests are:

- Application Pod
- Node Local DNS (optional)
- kube-dns Service
- CoreDNS Pods
- Upstream DNS Server

Tools like CoreDNS log plugin, Hubble, and Inspektor Gadget can help you understand the DNS request flow through different components in the cluster.
Once you have the necessary visibility into the DNS request flow, we can identify and resolve DNS issues more effectively.

This is a guest post by our team on the Container Days blog, based on our recent talk at the event where we covered the tools
and techniques that can help you debug DNS request flows in Kubernetes clusters. For an in-depth look, check out the full post on their blog!

[Read the full post on Container Days blog](https://www.containerdays.io/blog/debugging-dns-request-flows-in-kubernetes-clusters/).
