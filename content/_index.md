---
title: 'Inspektor Gadget'
link: https://kinvolk.github.io/inspektor-gadget/
logo: '/media/brand-logo.svg'
logo_bg_img: 'product-bg-1'
tagline: ''
description: A collection of eBPF-based _gadgets_ to debug and inspect Kubernetes apps and resources
hero:
  merge: true # Will merge these hero definitions into this section pages
  style:
    class: header-bg-ig
    bgcolor: '#34002C'
    fgcolor: '#EC83AB'
    titlecolor: '#EC83AB'
    descriptioncolor: white
quick_features:
  title: The Inspektor has arrived
  description: All the tools you need to investigate your cluster's toughest issues 
  shape_color: '#FEEAEF'
  icon_color: '#F72E5C'
  features:
    - text: Expanding BPF usage from single nodes to across the entire cluster
      icon: expand
      shape: shape-blue-1
    - text: Maps low-level Linux resources to high-level Kubernetes concepts
      icon: layers
      shape: shape-blue-2
    - text: Use stand-alone or integrate into your own tooling
      shape: shape-blue-3 
      icon: integration
features:
  - title: eBPF-based tooling for investigating the toughest Kubernetes issues
    icon: inspektor-gadget-feature.svg
    feature_matrix: gadgets.yml
    style:
      fgcolor: '#EC83AB'
      bgcolor: '#34002C'
    description: 'Inspektor Gadget provides a wide selection of BPF tools to dig deep into your Kubernetes cluster'
    feature_matrix:
      data: gadgets
      title: The Gadgets
      learn_more_link: https://www.inspektor-gadget.io/docs/latest/guides/
      description: Find information about all the Inspektor Gadget gadgets organized into their corrosponding categories
---