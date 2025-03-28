---
authors: ["maya-singh", "chris-kuehl"]
title: "Visualize gadget data with the Inspektor Gadget plugin for Headlamp"
description: "Visualize gadget data with the Inspektor Gadget plugin for Headlamp"
draft: false
tags:
  [
    "Cloud Native Rejekts",
    "CNCF",
    "eBPF",
    "kubernetes",
    "UX",
    "Headlamp",
    "UI",
    "Inspektor Gadget",
  ]
slug: /2025/03/inspektor-gadget-plugin-for-headlamp
image: /media/headlamp-plugin-splash.jpg
---

[Headlamp](https://headlamp.dev) is an open-source Kubernetes UI that simplifies cluster management by providing an intuitive interface for visualizing and interacting with your Kubernetes resources. Whether you're a novice or an experienced Kubernetes operator, Headlamp makes it easy to manage your clusters without diving deep into the command line.

[Inspektor Gadget](https://inspektor-gadget.io) (IG) allows you to gather information about your system and applications  in the context of your Kubernetes environment. It simplifies the use and distribution of eBPF programs, enabling users to collect detailed insights about their applications and clusters.

<!-- truncate -->

## Visualizing data from Inspektor Gadget

Inspektor Gadget began as a set of command line tools that collect systems data and now offers a number of interfaces to make use of that data . This data can be made more effective by integrating it with other tools that streamline visualization and relate the data to resources.

To provide an interactive and visual user experience, we've worked with the Headlamp team to develop a plugin for Headlamp that seamlessly integrates Inspektor Gadget into the Headlamp UI. This plugin adds a new Gadgets section to Headlamp’s sidebar, allowing users to explore the different gadgets available and understand the data within their Kubernetes environment – including visualizing it alongside other cluster resources. The Inspektor Gadget plugin for Headlamp provides a user-friendly interface for interacting with Inspektor Gadget’s features.

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/fzDZXeK7Ric?si=38PeLBBKXDIBUwuN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Additionally, users can embed these gadgets within pod or node views, enabling them to access Inspektor Gadget 's data directly where they manage their Kubernetes resources. Users also have the option to configure gadgets to be long running or use them on demand. This integration ensures that operators can understand what is happening with their clusters, enhancing their ability to monitor and troubleshoot effectively.

## Future Enhancements

While the plugin is already powerful, we're committed to further improving this integration. Some ideas we have for the future include:
*	**Exporting data to Prometheus**: Allowing users to export data to Prometheus for a longer timespan of historical data.
*	**Embedding Views in Other Places**: Expanding the locations where gadgets can be embedded within the UI.
*	**Improved visualizations**: We’ve started with some simple views (tables, histograms, etc.) but want to make exploring and interacting with the data a richer experience going forward.

## Inspektor Gadget and Headlamp at KubeCon Europe 2025

We're excited to announce that we'll be showcasing this plugin at KubeCon Europe in London. Visit the IG + Headlamp joint kiosk to see the plugin in action and learn more about how it can enhance your Kubernetes experience.

* **Inspektor Gadget and Headlamp Kiosk at the Project Pavilion**
  - April 2nd, 10:45am – 7:45pm
  - Kiosk 22B
* **Contribfest: Make Your Own UI for Kubernetes with Headlamp**
  - April 4th, 11:00am
  - Level 3, ICC Capital Suite 1
* **Contribfest: Kubernetes Observability Simplified: Build, Debug, and Monitor with Inspektor Gadget**
  - April 3rd, 2:15pm
  - Level 3 | ICC Capital Suite 17

We invite you to try the plugin and share your feedback with us. Together, we can continue to advance the state of UI and UX around Kubernetes.
Thank you for your support, and we look forward to seeing you at KubeCon Europe!
