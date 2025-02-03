---
authors: [maya-singh]
description: "Announcing the Deprecation of Built-in Gadgets"
draft: false
tags: 
  [
    "InspektorGadget",
    "gadget",
    "eBPF",
    "built in gadgets",
    "image based gadgets"
  ]
title: "Announcing the Deprecation of Built-In Gadgets"
slug: /2025/02/deprecation-built-in-gadgets
image: /media/splash/2025-02-03-sunset.jpg
---
Hi Inspektors, with the release of [v0.37.0](https://github.com/inspektor-gadget/inspektor-gadget/releases/tag/v0.37.0), we are announcing the deprecation of built-in gadgets, which will be removed from Inspektor Gadget in six months. We have made significant progress in making Inspektor Gadget a modular framework that allows users to easily collect Linux kernel data using eBPF. Image-based gadgets, a key component of this framework, should be used moving forward and will replace built-in gadgets.
<!-- truncate -->

While built-in gadgets were great for the initial scope of the project, when Inspektor Gadget was exclusively an interactive debugging tool, the project has evolved to become a general data collection tool. This evolution created a need for a more extensible version of gadgets that aren’t embedded into the core binary. Image-based gadgets were created as a response to these requirements and have become a fundamental building block of the Inspektor Gadget framework. 

We are deprecating built-in gadgets to lighten up the Inspektor Gadget and to focus our efforts exclusively on image-based gadgets to continue to make Inspektor Gadget the best project it can be. If you are using built-in gadgets, please migrate to image-based gadgets as soon as possible. Documentation for migrating to image-based gadgets can be [found here](https://www.inspektor-gadget.io/docs/v0.37.0/gadgets/switching_to_image_based_gadgets). Image-based gadgets provide the same, and in some cases, improved functionality over built-in gadgets but may require some adjustments to your system, and we are here to support you. Please don't hesitate to reach out to us on [Slack](https://kubernetes.slack.com/archives/CSYL75LF6) if you need any assistance.

