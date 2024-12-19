---
authors: [kapil-sharma]
description: "Introducing Event Generator for Inspektors"
draft: false
tags: 
  [
    "LFXMentorship",
    "InspektorGadget",
    "gadget",
    "eBPF",
    "go",
    "golang",
    "debug",
    "DNS",
    "event",
    "event-generator",
  ]
title: "Introducing Event Generator for Inspektors"
slug: /2024/12/inspketor-gadget-event-generator
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

Hello Inspektors!
I'm [Kapil Sharma](https://github.com/h4l0gen/), I have been working with [Qasim Sarfraz](https://github.com/mqasimsarfraz/) and [Burak Ok](https://github.com/burak-ok) as part of the Mentorship Program. In this blog post, we will explore the capabilities of [Event Generator](https://github.com/inspektor-gadget/inspektor-gadget/issues/3193). Which can be used to debug Kubernetes by generating specific events.

In this blog we will discuss need of Event Generator, how to use it and benefits of it?

<!-- truncate -->

Before diving into the details of the event generation feature, let's first understand what Inspektor Gadget is?

## What is Inspektor Gadget?
Inspektor Gadget is an eBPF-based tool and system inspection framework for Kubernetes, Containers, and Linux hosts. It translates low-level Linux resources into higher-level concepts like Kubernetes pods and containers. It can be used as a standalone tool or integrated into your existing workflows. Inspektor Gadget offers a range of gadgets and also gives you the flexibility to create custom ones. It provides different clients to interact with image-based gadgets, which we will explore further in the documentation.

## The Need for Event Generation in Inspektor Gadget
Now that we understand what Inspektor Gadget is, let's discuss why an event generation feature is needed:

- Testing and Debugging: When working with complex systems like Kubernetes clusters, generating realistic events is crucial for effective testing and debugging. The event generation feature in Inspektor Gadget provides a convenient way to simulate DNS and HTTP events within a cluster, enabling users to test their applications under different scenarios and identify potential issues or bottlenecks.
- Monitoring and Performance Analysis: By generating events, users can gain valuable insights into the behavior and performance of their applications.
- Complementing Inspektor Gadget's Capabilities: The event generation enhances the functionality of Inspektor Gadget by providing a way to generate specific events on-demand, allowing users to test and debug their systems more effectively.

By providing the ability to generate realistic events, the event generation feature in Inspektor Gadget empowers users to thoroughly test, monitor, and debug their Kubernetes clusters and applications. It fills a gap in the testing and debugging process, making it easier to identify and resolve issues, optimize performance, and ensure the overall stability and reliability of the system.

## Overview of the Event Generation Feature
The event generation feature aims to provide a suite of tools for monitoring and debugging Kubernetes clusters. The feature allows users to generate DNS and HTTP events within a cluster for testing, monitoring, or debugging purposes. By creating real traffic and scenarios, users can gain valuable insights into the behavior and performance of their applications. What makes this feature unique is its dual-mode operation:

- Event generation using existing pods: Network namespace sharing for precise container-level event generation
- Event-generation using new pods: Independent pod creation for isolated event generation

The system leverages Linux network namespaces, Kubernetes runtime internals, and container networking principles to generate events that closely mimic real application traffic patterns.

## Architecture and Design
With an understanding of the need for event generation, let's explore the architecture and design of this feature in Inspektor Gadget. The architecture is designed to be modular and extensible, allowing for easy integration with the existing Inspektor Gadget components.
The event generation feature offers two main approaches:

1. Existing pod-based generation: This lightweight approach leverages the power of Linux namespaces to generate events within a specific namespace. It works by executing commands inside a target container's network namespace, enabling precise control over the event generation process. This approach is particularly useful when you want to test or debug a specific container of an application running within a namespace.
2. New pod-based generation: This approach creates separate pods to generate events. It provides flexibility and scalability, as you can easily spin up multiple event generator pods to simulate various scenarios. This approach is more isolated and allows for generating events independently of the existing applications.

The event generator is implemented as an operator in Inspektor Gadget. The main entry point for the operator is defined in the `operator.go` file. It is responsible for managing the lifecycle of event generation instances based on the provided parameters. The operator handles the creation, configuration, and termination of event generators, ensuring smooth operation and resource management.

The design emphasizes modularity, with separate components for handling different event types. This modularity allows for easy extension and customization, enabling users to add support for new event types or modify existing ones to suit their specific needs.

## Code Walkthrough
Let's take a closer look at the implementation of the event generation feature in Inspektor Gadget. We'll walk through the important code snippets and components that make up the event generator.
 Here's a simplified version of the eventGenOperator struct:
```go
type eventGenOperator struct{}

func (e eventGenOperator) Name() string {
	return name
}

func (e eventGenOperator) Init(params *params.Params) error {
	return nil
}

func (e eventGenOperator) InstantiateDataOperator(gadgetCtx operators.GadgetContext, instanceParamValues api.ParamValues) (operators.DataOperatorInstance, error) {
	// Instantiate and configure the event generator based on the provided parameters
	// ...
}
```
The InstantiateDataOperator method is responsible for creating and configuring instances of the event generator based on the provided parameters. It determines the appropriate approach (existing or creating new pods) based on the parameters and the execution context.
For existing pod-based generation, the event generator uses the `ns_generator.go` file, which defines the Generator type. Here's a simplified version of the Generate method:
```go
func (d *Generator) Generate(params map[string]string, count int, interval time.Duration) error {
	// Generate events within the target container's network namespace
	// ...
	err = nsenter.NetnsEnter(int(pid), func() error {
    	for i := 1; i <= count || count == -1; i++ {
        	if err := d.generateDNSQuery(domain); err != nil {
            	d.logger.Warnf("DNS query failed: %v", err)
        	}
        	if i < count || count == -1 {
            	time.Sleep(interval)
        	}
    	}
    	return nil
	})
	// ...
}
```
The Generate method uses the `nsenter` package to execute DNS queries within the target container's network namespace. It iterates based on the specified count and interval, generating DNS events.

For new pod-based generation, the event generator uses the `pod_generator.go` files for DNS and HTTP events. Here's a simplified version of the Generate method for DNS events:
```go
func (d *PodGenerator) Generate(params map[string]string, count int, interval time.Duration) error {
	// Create a new pod to generate DNS events
	// ...
	command := fmt.Sprintf("i=1; while [ $i -le %d ] || [ %d -eq -1 ]; do nslookup %s; i=$((i+1)); sleep %s; done",
    	count, count, domain, sleepCount)
	container := corev1.Container{
    	Name:	"dns-eventgen-container",
    	Image:   "busybox",
    	Command: []string{"sh", "-c", command},
	}
	// ...
}
```

The Generate method creates a new pod with a busybox container that executes the specified command to generate DNS events. The command is constructed based on the provided parameters, such as the domain, count, and interval.
The event generator relies on the `params.go` file to handle parameter parsing and validation. It defines constants for the parameter keys and provides utility functions to parse parameter strings into maps.
Throughout the implementation, the event generator leverages the Kubernetes client-go library to interact with the Kubernetes API server. It uses the client to retrieve pod and container information, create pods, and manage the event generation lifecycle.
By combining these components and leveraging the power of Linux namespaces and the Kubernetes API, the event generator provides a flexible and efficient way to generate DNS and HTTP events within a Kubernetes cluster.

## Usage and Configuration
Now that we have explored the architecture, design, and code of the event generation feature, let's look at how to use and configure it. To enable and configure event generation, users need to set the appropriate parameters, such as the event type, params and target pod/namespace. Currently all parameters are the instance parameters, but in future `--eventgen-enable` would be available as Global parameters.

### Existing Containers:
To generate events from existing containers/pods we can do this by help of `kubectl-gadget`.
```bash
kubectl gadget run trace_dns \
  --filter name==example.com. \
  --eventgen-enable=true \
  --eventgen-type=dns \
  --eventgen-params=domain:example.com \
  --eventgen-count=5 \
  --eventgen-interval=5s \
  --eventgen-namespace=default \
  --eventgen-pod=eventgen-pod \
  --eventgen-container=eventgen-container
```
This command enables DNS event generation, sets the domain to "example.com", generates 5 events with a 5-second interval, and targets a specific pod and container in the "default" namespace.
By providing the necessary parameters, users can easily configure and customize the event generation process to suit their specific requirements.

### New Containers
To generate events from new containers we can use both `ig` and `kubectl-gadget`. If you don’t specify namespace/pod/container it will automatically create a new pod to generate events from. Let me show with `ig` this time:
```bash
sudo ig run trace_dns \
  --filter name==example.com. \
  --eventgen-enable=true \
  --eventgen-type=dns \
  --eventgen-params=domain:example.com \
  --eventgen-count=5 \
  --eventgen-interval=5s
```
> NOTE:
> - for `--eventgen-type` two generators are available so far: `dns` and `http`
> - for `http` generator params can be set as `--eventgen-params=url:example.com`.
Do not add 'http://' as prefix, provide domain name only.
> - User may skip `--eventgen-interval` and `-eventgen-count` flags. By default it generates events in a loop with `1ms` interval.
> - `--eventgen-interval` supports time format compatible with [sleep](https://phoenixnap.com/kb/linux-sleep) linux command.

## Challenges and Learnings
Implementing the event generation feature came with its own set of challenges. Here are some of the key challenges faced during the implementation:

### 1. Initial Design and Implementation:

- One of the initial challenges was deciding how to implement the event generator within Inspektor Gadget. We had to choose between implementing it as an integral part of the framework or as an external program.
- Another challenge was determining whether the event generation should be done on the client-side or server-side. Server-side generation was the preferred approach, but it raised concerns about allowing the gadget pod to have the necessary RBAC permissions to create and delete pods in all namespaces. We decided not to change the RBAC permissions of the gadget pod.

To address these challenges, we agreed on the following approach:

- For existing pods, we would use server-side generation.
- For newly created pods, we would use client-side generation.
- The distinction between server-side and client-side generation would be made using the GadgetContext.IsRemoteCall() function.

For the complete discussion, check [this](https://github.com/inspektor-gadget/inspektor-gadget/pull/3538).

### 2. Working with Container Runtime Internals and Linux Namespaces:

- Understanding and working with container runtime internals and Linux namespaces requires diving deep into the architecture and learning how to switch between namespaces to execute commands within a container's network namespace.


### 3.Integration with Existing Inspektor Gadget Codebase:

- Integrating the event generation feature with the existing Inspektor Gadget codebase and ensuring compatibility with the container collection APIs was a challenge.
- I have gone through from each options available in container-collection and
- It involved designing and implementing modular components that could seamlessly integrate with the existing infrastructure.

Throughout the LFX Mentorship, I gained valuable insights into Kubernetes networking, container runtime internals, and the importance of testing and debugging in a distributed environment. I also had the opportunity to collaborate with my mentor and the community, which enhanced my communication and teamwork skills.

## Future Enhancements
Looking ahead, there are several potential improvements and additions to the event generation feature. Some ideas include:

- Supporting additional event types, such as TCP/UDP traffic or application-specific events.
- Enhancing the configuration options to allow more granular control over event generation.
- Integrating with other Inspektor Gadget components for a more seamless user experience.
- Optimizing performance and resource utilization during event generation.
- Enabling users to create custom event generators at the gadget level through well-defined APIs.

I am excited to continue contributing to the Inspektor Gadget project and collaborating with the community to make these enhancements a reality.

## Conclusion
My journey in the LFX Mentorship program with Inspektor Gadget has been an incredible learning experience. Over the course of three months, I gained deep technical expertise in container runtime internals, Linux namespaces architecture, and Kubernetes networking. I implemented container namespace switching mechanisms, worked with container collection APIs, and enhanced pod networking functionalities.
I am grateful for the opportunity to connect with others in the CNCF community and learn from experienced mentors. I plan to stay involved in the Inspektor Gadget community after the mentorship and continue creating value for more users.
If you have any questions or feedback about the event generation feature or my experience, please feel free to reach out.

Happy event generating with Inspektor Gadget!
