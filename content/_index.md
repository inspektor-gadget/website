---
title: 'Inspektor Gadget'
link: https://kinvolk.github.io/inspektor-gadget/
logo: '/media/brand-logo.svg'
logo_bg_img: 'product-bg-1'
tagline: ''
description: eBPF-based collection of _gadgets_ to debug and inspect Kubernetes apps and resources
hero:
  merge: true # Will merge these hero definitions into this section pages
  style:
    class: header-bg-ig
    bgcolor: '#391628'
    fgcolor: '#08a2af'
    descriptioncolor: white
quick_features:
  title: The Inspektor has arrived
  description: All the tools you need to dig into the toughest problems on Kubernetes 
  shape_color: '#FEEAEF'
  icon_color: '#F72E5C'
  features:
    - text: A comprehensive suite of "gadgets" of investigate any issue
      icon: container # Need a flashlight image like from the logo
      shape: shape-blue-1
    - text: Map low-level Linux resources to higher-level Kubernetes resources
      icon: filesystem # Need an bullseye, maybe with an arrow like from the logo
      shape: shape-blue-2
    - text: Easy to use interface to integrate into your tooling
      shape: shape-blue-3 
      icon: update
highlights:
  - icon: 'lock'
    title: Get to the bottom of things
    description: Immutable filesystem, minimal footprint, automated security updates are just some of the built-in security features
  - icon: 'wrench'
    title: Built for Containers
    description: The OS image shipped includes just the minimal amount of tools to run container workloads.
  - icon: 'gear'
    title: Automated Updates
    description: Keep your cluster secure by always running an OS with the latest security updates and features
features:
  - title: Powerful suite of gadgets for conquiring Kubernetes
    icon: container-feature.svg
    style:
      fgcolor: '#46c1c7'
      bgcolor: '#391628'
    description: 'Inspektor Gadget provides a suite of tools .'
    highlights:
      - icon: flatcar-app
        title: Immutable infrastructure
        description: Your immutable infrastructure deserves an immutable Linux OS. With Inspektor Gadget, you manage your infrastructure, not your configuration.
      - icon: flatcar-app
        title: Designed to scale
        description: Inspektor Gadget includes tools to manage large-scale, global infrastructure. You can manage update polices, versions and group instances with ease.
      - icon: flatcar-app
        title: Reduced complexity
        description: With containers, dependencies are packaged and delivered in container images. This makes package managers unnecessary and simplifies the OS.
  - title: Secure by Design
    icon: secure-feature.svg
    style:
      fgcolor: '#fddc60'
      bgcolor: '#12172c'
    description: Inspektor Gadget's built-in security features, minimal design and automated updates provide a strong foundation for your infrastructure's security strategy.
    highlights:
      - icon: flatcar-secure
        title: Security patch automation
        description: Running the latest security patches is crucial to removing potential vulnerabilities. Inspektor Gadget's automated updates does this for you.
      - icon: flatcar-secure
        title: Immutable filesystem
        description: By making the system partition read-only, Inspektor Gadget eliminates a whole class of high-impact security vulnerabilities.
      - icon: flatcar-secure
        title: Minimal attack surface
        description: Inspektor Gadget includes only what is required to run containers. By minimizing the size and complexity of the OS, the attack surface is also reduced.
  - title: Automated Updates
    icon: update-feature.svg
    style:
      fgcolor: '#31bb4d'
      bgcolor: '#12172c'
    description: With Inspektor Gadget, you'll always be running the most stable, secure and up-to-date Flatcar version by taking advantage of the automated, atomic update feature.
    highlights:
      - icon: flatcar-update
        title: Self-driving updates
        description: Inspektor Gadget uses the same reliable update mechanism as Google's ChromeOS to provide safe, secure and automated system updates.
      - icon: flatcar-update
        title: Always up-to-date
        description: With Inspektor Gadget's automated updates, you'll benefit from always running the most stable, secure and feature-rich version of the OS.
      - icon: flatcar-update
        title: Managed updates
        description: The Kinvolk Update Service allows for defining instance groups, assigning update channels and controlling the frequency, time of day and rate of updates.
grid_statements:
  title: Migrating from CoreOS Container Linux
  statements:
    - '# <span style="color: #08a2af">Drop-in replacement for CoreOS</span>

    Inspektor Gadget is directly derived from CoreOS, enabling seamless in-place migration.

    ## [Learn more »](/blog/2020/03/steps-to-migrate-from-coreos-to-flatcar-container-linux/)'
    - '# <span style="color: #12172c">Migrating from CoreOS Container Linux</span>

    Upgrading to Inspektor Gadget is the same as a CoreOS update.'
    - '# <span style="color: #12172c">CoreOS to Flatcar migration demo</span>

    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
      <iframe title="Youtube video showing how to migrate from CoreOS to Inspektor Gadget" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" src="https://www.youtube-nocookie.com/embed/mE2wbdncj1Y" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>'
  resources_section:
    title: Do more with Flatcar
    description: Discover your infrastructure's potential
    style: light
    resources:
      - title: Case Studies
        icon: page-text
        link: /blog/2019/07/how-pubnative-is-saving-30-on-infrastructure-costs-with-kinvolk-packet-and-kubernetes/
      - title: Documentation
        icon: page-chart
        link: https://flatcar-linux.org/docs/latest/
      - title: Security
        icon: lock-black
        link: /flatcar-container-linux/security
      - title: FAQ
        icon: chat
        link: /flatcar-container-linux/faq
      - title: Release Notes
        icon: page-write
        link: /flatcar-container-linux/releases
  contact:
    message: '# Get in touch!'
    simple: true
---
