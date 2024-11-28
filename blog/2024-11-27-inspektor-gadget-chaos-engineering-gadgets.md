---
authors: [Bharadwaja MeherRushi Chittapragada]
description: "Introducing Chaos Engineering Gadgets"
draft: true
tags:
  [
    "LFXMentorship",
    "InspektorGadget",
    "Chaos Engineering",
    "eBPF",
    "go",
    "golang",
    "Networking",
    "tests",
  ]
title: "Introducing Chaos Engineering Gadgets"
slug: /2024/11/introducing-chaos-engineering-gadgets
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

# Introducing Chaos Engineering Gadgets

Hey Inspektors! 👋  

I am [Bharadwaja Meherrushi Chittapragada](https://github.com/MeherRushi/), and I have been working under the mentorship of [Michael Friese](https://github.com/flyth) and [Mauricio Vásquez Bernal](https://github.com/mauriciovasquezbernal) as part of the LFX Mentorship Program. My project involves developing a set of gadgets for Inspektor Gadget to introduce system chaos (Issue [#3196](https://github.com/inspektor-gadget/inspektor-gadget/issues/3196)).  

In this blog post, we’ll dive into the chaos-inducing gadgets, exploring how they function, how they were built, and the alternatives we considered during development. We’ll also talk about the changes made along the way and why we made those decisions. But before we jump in, let’s take a quick look at **Inspektor Gadget** and how chaos engineering fits into the picture.

---

## What is Inspektor Gadget?  

Inspektor Gadget is a framework and toolset for data collection and system inspection on Kubernetes clusters and Linux hosts using **eBPF**. It simplifies the packaging, deployment, and execution of Gadgets (eBPF programs encapsulated in OCI images) and provides customizable mechanisms to extend their functionality.  
[Read more in the official docs](https://www.inspektor-gadget.io/docs/latest/).  

---

## What is Chaos Engineering, and what gadgets could help?  

**Chaos Engineering** is all about testing a system's ability to handle unexpected disruptions and stressful conditions in production ([ref: Principles of Chaos](https://principlesofchaos.org/)). In simple terms, it means intentionally introducing faults or disruptions to see how the system responds. The idea is to create gadgets that can inject chaos into the system, so developers can test the system's resilience in a controlled environment and build fallback mechanisms for potential production disruptions.

The goal of this project is to build gadgets that introduce chaos into systems.

With **eBPF**, we can trigger these disruptions in a few ways:

-   Changing the return values of kernel functions
-   Dropping or modifying network packets
-   Simulating system call failures

The main objective is to develop a set of gadgets in Inspektor Gadget that make it easy to test system chaos. Here are some ideas for the gadgets we're planning to implement:

1.  **DNS:** Drop DNS requests and/or responses based on:
    -   The container or process that initiated the request
    -   The target URL
    -   The DNS server
2.  **TCP/UDP:** Drop network packets based on:
    -   Source or destination IP addresses
    -   The originating or destination pod or process
3.  **Syscalls:** Simulate system call failures based on:
    -   The container or process performing the syscall
    -   Specific system calls

# Network Chaos Gadgets  

Network failures are a frequent occurrence and should be rigorously tested before deploying applications on a Kubernetes cluster. The network primarily encounters three types of issues:  

- **Random Packet Drops:** Unexpected loss of packets during transmission.  
- **Random Bit Flips:** Corruption of data due to flipped bits in the packets.  
- **Packet Delays:** Latency introduced due to delays in packet delivery.  
- **Packet Duplication:** Introducing duplicate packets into the network stream.
- **Bandwidth Issues:** Simulating reduced or fluctuating network bandwidth.

For now, we’ve decided to focus on building gadgets to address the first three issues.

![Network chaos gadgets diagram](/media/2024-11-27-network-chaos-gadgets.png)

We can introduce these disruptions using **eBPF programs** attached to **TC (Traffic Control) hook points**. Some programs can also be attached to the XDP hookpoint, which is available only at ingress. XDP handles packets at the earliest possible point---directly in the driver---before `sk_buff` allocation. However, Inspektor Gadget doesn't support the XDP hookpoint just yet, but we plan to add support for it after building the initial set of gadgets.

For now let's take a brief look at the _TC Hook point_

---

## Understanding the TC Hook Point  

### What is Traffic Control (TC)?  
Traffic Control (TC) is a Linux subsystem that provides mechanisms for managing and shaping network traffic. It enables administrators and developers to control packet queuing, prioritize certain types of traffic, and manage bandwidth usage.  

In the context of eBPF, TC acts as a critical hook point in the networking stack where packets can be intercepted, inspected, and modified.  

### Where Does the TC Hook Point Fit in the Networking Stack?  

The TC hook point is positioned **after the allocation of `sk_buff` (socket buffer)** but **before the packet reaches the firewall or upper networking layers**. This allows TC to access packets with full metadata stored in the `sk_buff` structure, enabling more complex operations compared to earlier hook points like XDP (eXpress Data Path).  

Here’s a simplified flow of packet processing in the Linux networking stack:  
1. **NIC (Network Interface Card):** Receives the packet.  
2. **XDP (if enabled):** Handles packets at the earliest possible point, directly in the driver, even before `sk_buff` allocation.  
3. **`sk_buff` Allocation:** The packet is wrapped in the `sk_buff` structure for further processing.  
4. **TC (Traffic Control):** The packet passes through TC ingress or egress for inspection and modification.  
5. **Firewall (iptables/nftables):** Processes the packet based on security and routing rules.  
6. **Networking Stack:** Forwards packets to the application layer or routes them out via the appropriate interface.  

---

### Ingress and Egress Hook Points  

At the TC layer, there are two main hook points:

1.  **Ingress:** This hook captures packets ***entering*** a network interface, making it ideal for inspecting or modifying packets before they are processed by the local system or forwarded to another destination. In a Kubernetes environment, this refers to ***incoming*** packets to pods or nodes.

2.  **Egress:** This hook captures packets ***leaving*** a network interface, allowing for manipulation or inspection just before the packets are transmitted out of the system. In Kubernetes, it refers to ***outgoing*** packets from pods or nodes heading toward an external destination.

By attaching eBPF programs to these hook points, you can simulate various network scenarios, such as dropping, delaying, or corrupting packets, tailored to specific ingress or egress paths.  

---

### The `sk_buff` Structure  

At the TC hook point, packets are represented by the **`sk_buff` (socket buffer)** structure. This is a kernel data structure that holds all the metadata about a packet, including its headers, payload, and other attributes. Some key fields include:  

- **`data` and `data_end`:** Define the start and end of the packet buffer.  

It also contains some other metadata and using the pointers to the start and end of the data of the packet, we can navigate through the packet and read or modify the packet using bpf_helper functions.  

When writing eBPF programs, these fields can be accessed to analyze and modify packets.  

---

### Attaching eBPF Programs at TC

Attaching these programs is part of the inspecktor gadget framework and is written in go.

### Possible Actions in eBPF Programs  

eBPF programs attached to TC hook points can perform the following actions:  

| **Action** | **Description** | **Code Example** |
| --- | --- | --- |
| **Drop Packets** | Prevent packet processing (simulate network failures). | `return TC_ACT_SHOT;` |
| **Pass Packets** | Allow packet to continue without modification. | `return TC_ACT_OK;` |
| **Redirect Packets** | Forward packet to a different network interface (simulate routing changes). | `bpf_redirect(<interface_index>, BPF_F_INGRESS);` |
| **Modify Packets** | Alter packet headers or payload (e.g., simulate data corruption). | See the code example below. |
```c
// Example: Modify the source IP in an IPv4 header
struct iphdr *iph = bpf_hdr(skb);
if (iph) {
    iph->saddr = bpf_htonl(0xC0A80001); // Change to 192.168.0.1
}
return TC_ACT_OK;
```

These actions provide the foundation for implementing network chaos experiments in a controlled environment.

<!-- # Random Drop packet

- Need to explain how random packets are dropped in the general network - like in normal networks in general. and the issues they cause and why it is important for them to test the application for resistance against the packet drops

- existing tools that can be used : enable netem and introduce the random dropping of packets using bernoulli probability
(more context about netem)

- planning to explain the general distrubtion of packet drop and explain the bernoulli packet drop

- like how different packet drop patterns are there in general etc and explain a little about 

- explain the logging methods in inspektor gadget - like basically - If you're sending events to user-space, you can create metrics from those by just adding a couple of annotations to your gadget.yaml file, or by using some well-known types (TODO links to macros) inside your struct definition inside eBPF code.

    If you don't want to emit events, because it would just be too much throughput, you can choose to write the metrics into eBPF maps instead and let IG create a data source (TODO link to data source) from it. Those can then be exported to for example Prometheus.
(more info - https://www.inspektor-gadget.io/docs/latest/gadget-devel/metrics)

- explain about the parameters for the gadget
    - about the filter IP and filter port and how they are independent and what happens when both, either one or both are specified.

    - explain about the TCP/UDP paramters about how we can only choose to drop either protocol

    - explain about the hookpoint and how we can choose either egress or ingress

- explain about the code optimization in which we have made to TC_ACT_OK packets which let the packets go up the TCP/IP linux network stack  if the packet is not to be filtered at the earliest so as to have less computation and how the code is modulized and the filling of event details happens in the last. -->

# Random Drop packet

### Understanding Packet Loss in Real-World Networks

In the intricate ecosystem of network communications, packet loss is not an anomaly but a natural phenomenon. Networks are complex, dynamic systems where data transmission is subject to numerous environmental and infrastructural challenges. In real-world network scenarios, packets can be dropped due to various reasons:

| Cause of Packet Loss | Description | Impact |
|---------------------|-------------|--------|
| Network Congestion | Overloaded network routes | Reduced throughput |
| Hardware Limitations | Network device capacity | Intermittent connectivity |
| Transmission Errors | Signal degradation | Data integrity issues |
| Routing Problems | Inefficient path selection | Communication breakdowns |
| Bandwidth Constraints | Insufficient network capacity | Performance degradation |

These seemingly random disruptions are not just technical nuisances but critical factors that can significantly impact application performance, user experience, and system reliability. By understanding and simulating these network imperfections, we can build more robust, resilient software systems that gracefully handle unexpected network conditions.

## Probabilistic Packet Loss Modeling

### Bernoulli Probability: A Mathematical Lens on Network Randomness

When we seek to simulate network packet loss, we turn to probability theory -- specifically, the Bernoulli distribution. The Bernoulli model provides a simple yet powerful mechanism to model independent, random events with a fixed probability of occurrence. In our network context, each packet has an independent, predefined chance of being dropped, mirroring the unpredictable nature of real-world network communications.

```c
// Probabilistic packet drop mechanism using Bernoulli distribution
static int rand_pkt_drop_map_update(struct event *event,
                    struct events_map_key *key,
                    struct sockets_key *sockets_key_for_md)
{
    // Generate a cryptographically secure random number
    __u32 rand_num = bpf_get_prandom_u32();

    // Calculate drop threshold based on configured loss percentage
    volatile __u64 threshold =
        (volatile __u64)((volatile __u64)loss_percentage *
                 (__u64)0xFFFFFFFF) / 100;

    // Probabilistic packet drop
    if (rand_num <= (u32)threshold)
    {
        // Detailed event logging
        event->drop_cnt = 1;
        return TC_ACT_SHOT; // Drop the packet
    }
    return TC_ACT_OK; // Allow packet to pass
}
```

### Alternative Approaches (NetEm and Markov chain models)

Network Emulation (NetEm) is a powerful tool in the Linux kernel that allows for the simulation of various network conditions, such as latency, packet loss, duplication, and reordering. NetEm operates at the network layer and can be configured using the `tc` (traffic control) command. It provides a flexible and comprehensive way to introduce network impairments for testing purposes.

#### Using NetEm for Packet Loss

NetEm can simulate packet loss using a variety of models, including Bernoulli and Gilbert-Elliott models. The Bernoulli model introduces random packet loss based on a fixed probability, similar to our eBPF implementation. The Gilbert-Elliott model, on the other hand, uses a **two-state Markov chain** to simulate bursty packet loss, which is more representative of real-world network conditions.

For now, we have chosen to proceed with the Bernoulli model due to its simplicity and suitability for the space and complexity constraints inherent in eBPF programs. Additionally, we are planning to include the Gilbert-Elliott model in the future to better simulate bursty packet loss scenarios, providing a more comprehensive testing environment.

```sh
# Example: Simulate 10% packet loss using NetEm
tc qdisc add dev eth0 root netem loss 10%
```

#### Why We Chose eBPF Over NetEm

While NetEm is a powerful tool, our goal was to leverage eBPF to achieve similar functionality. eBPF offers several advantages:

- **Performance:** eBPF programs run in the kernel, providing high performance with minimal overhead.
- **Granularity:** eBPF allows for fine-grained control over individual packets, enabling more precise manipulation.
- **Integration:** eBPF can be integrated directly into existing frameworks like Inspektor Gadget, providing a seamless experience for users.

By using eBPF, we aim to create a flexible and efficient solution for simulating network impairments, tailored to the specific needs of our project.


### Configurable Gadget Parameters

The implementation offers granular control over packet dropping through a set of configurable parameters:

```c
const volatile struct gadget_l3endpoint_t filter_ip = { 0 };
const volatile __u16 port = 0;
const volatile __u32 loss_percentage = 100;
const volatile bool filter_tcp = true;
const volatile bool filter_udp = true;
const volatile bool ingress = false;
const volatile bool egress = true;
```

These parameters enable precise targeting of packet drops:
- Specific IP addresses (IPv4 and IPv6)
- Particular network ports
- Protocol-specific filtering (TCP/UDP)
- Network direction (ingress/egress)
- Configurable loss percentage


### Filtering Scenarios

| IP Filter | Port Filter | Behavior |
|-----------|-------------|----------|
| Unspecified | Unspecified | Drop all packets* |
| Specified | Unspecified | Drop packets for specific IP* |
| Unspecified | Specified | Drop packets for specific port* |
| Specified | Specified | Drop packets matching both IP and port* |

*Always drop packets based on loss percentage and default loss percentage is 100%

### Protocol Selection
- `filter_tcp`: Enable/disable TCP packet drops
- `filter_udp`: Enable/disable UDP packet drops

### Network Direction Hooks
- `ingress`: Incoming packet filtering
- `egress`: Outgoing packet filtering

### Optimization

The implementation emphasizes computational efficiency through early-stage packet filtering:

```c
static __always_inline int packet_drop(struct __sk_buff *skb)
{
    // Early protocol and header validation
    if ((void *)(eth + 1) > data_end) {
```c
    return TC_ACT_OK; // Eth headers incomplete - Letting them pass through without further processing
    }

    // Protocol-specific processing
    switch (bpf_ntohs(eth->h_proto)) {
    default:
        return TC_ACT_OK; // Unhandled protocol, pass through
    case ETH_P_IP: // IPv4 Processing
        if (filter_ip.version == 6)
        return TC_ACT_OK; // If filtering IPv6, let IPv4 pass through

        ip4h = (struct iphdr *)(eth + 1);

        // Check if IPv4 headers are invalid
        if ((void *)(ip4h + 1) > data_end)
        return TC_ACT_OK;

        // Early filtering based on IP address
        if (ingress && filter_ip.addr_raw.v4 != 0 &&
        (filter_ip.addr_raw.v4 != ip4h->saddr))
        return TC_ACT_OK;
        if (egress && filter_ip.addr_raw.v4 != 0 &&
        (filter_ip.addr_raw.v4 != ip4h->daddr))
        return TC_ACT_OK;

        event.src.addr_raw.v4 = ip4h->saddr;
        key.dst.addr_raw.v4 = ip4h->daddr;
        event.src.version = key.dst.version = 4;
        sockets_key_for_md.family = SE_AF_INET;

        switch (ip4h->protocol) {
        case IPPROTO_TCP:
            if (!filter_tcp)
            return TC_ACT_OK;
            struct tcphdr *tcph =
            (struct tcphdr *)((__u8 *)ip4h +
                      (ip4h->ihl * 4));
            if ((void *)(tcph + 1) > data_end)
            return TC_ACT_OK;

            // Early filtering based on port
            if (ingress && port != 0 &&
            port != bpf_ntohs(tcph->source))
            return TC_ACT_OK;
            if (egress && port != 0 &&
            port != bpf_ntohs(tcph->dest))
            return TC_ACT_OK;

            event.src.proto_raw = key.dst.proto_raw = IPPROTO_TCP;
            event.src.port = bpf_ntohs(tcph->source);
            key.dst.port = skb->pkt_type == SE_PACKET_HOST ?
                   bpf_ntohs(tcph->dest) :
                   bpf_ntohs(tcph->source);
            sockets_key_for_md.proto = IPPROTO_TCP;
            break;
        }
    }
}
```

The `TC_ACT_OK` action is used to filter out packets that do not meet our criteria, allowing them to pass through without further processing. This ensures that we only collect data on packets that are relevant to our specific filtering conditions, optimizing performance and focusing our analysis on the targeted traffic. By performing early filtering, we reduce the computational overhead and improve the efficiency of the packet processing pipeline.

This approach ensures minimal computational overhead by quickly passing through packets that don't match filtering criteria.

## Logging and Observability

Comprehensive event capture is crucial in chaos engineering:

```c
struct event {
    gadget_timestamp timestamp_raw;
    struct gadget_l4endpoint_t src;
    gadget_counter__u32 drop_cnt;
    bool ingress;
    bool egress;
    gadget_netns_id netns_id;
    struct gadget_process proc;
};
```

The event structure captures rich metadata about dropped packets, enabling detailed analysis and understanding of network behavior under simulated stress conditions.

In Inspektor Gadget, there are two main metric strategies:

1. **User-Space Event Reporting**: Metrics are generated by sending events from eBPF programs to user-space. This method is easy to implement and suitable for lower throughput scenarios. It uses annotations in `gadget.yaml` or macros in eBPF struct definitions to define metrics.

2. **eBPF Map-Based Metrics**: Metrics are stored directly in eBPF maps, making this method more efficient for high-throughput scenarios like packet processing. It minimizes overhead and allows for fast performance, especially when *exporting data* to systems like **Prometheus**.

For the packet-dropping gadget, we chose eBPF map-based metrics due to its ability to efficiently handle high-throughput data with minimal overhead, ensuring fast performance while processing and tracking large volumes of packets.


Check the output format of the gadget on https://inspektor-gadget.io/docs/latest/gadgets/chaos_packet_drop

### Conclusion

This packet drop chaos gadget is more than a technical implementation -- it's a powerful tool for understanding and improving network system resilience. By providing a flexible, performant mechanism to simulate network imperfections, we enable developers to proactively identify and address potential vulnerabilities.

# Bit flip gadget

- Follows very similar story to that of the random drop gadget but just a change in the function `rand_pkt_drop_map_update` to `rand_bit_flip_map_update`. 

So, instead of dropping packets randomly, we call a `random_bit_flip` function on random packets. 

```c
static __always_inline int rand_bit_flip(struct __sk_buff *skb, __u32 *data_len)
{

    // Ensure the packet has valid length
    if (*data_len < 1) {
        return TC_ACT_OK;
    }

    // Get a random offset and flip a bit
    __u32 random_offset = bpf_get_prandom_u32() % *data_len;
    __u8 byte;

    // Use bpf_skb_load_bytes() to load the byte at the random offset
    if (bpf_skb_load_bytes(skb, random_offset, &byte, sizeof(byte)) < 0) {
        return TC_ACT_OK;  // Error in loading byte, return OK
    }
    
    // Flip a random bit in the byte
    __u8 random_bit = 1 << (bpf_get_prandom_u32() % 8);
    byte ^= random_bit;

    // Use bpf_skb_store_bytes() to store the modified byte back to the packet
    if (bpf_skb_store_bytes(skb, random_offset, &byte, sizeof(byte), 0) < 0) {
        return TC_ACT_OK;  // Error in storing byte, return OK
    }

    return TC_ACT_OK;
}
```

The `rand_bit_flip` function is designed to introduce randomness into network traffic by flipping a single bit in a packet's payload. First, it checks if the packet has a valid length; if the length is less than 1 byte, the function does nothing and returns `TC_ACT_OK`, allowing the packet to pass through unchanged. Then, a random offset within the packet is chosen based on the packet's data length. Using this offset, the function loads the byte at that position with the `bpf_skb_load_bytes()` helper. If this operation is successful, it randomly selects a bit within the byte and flips it by applying an XOR operation (`^=`) with a randomly chosen bit. After the modification, the byte is written back into the packet using `bpf_skb_store_bytes()`. If any of these operations fail, the function ensures the packet continues to flow through the network stack without disruption by returning `TC_ACT_OK`. The function allows for random bit flipping, simulating errors or disturbances in network traffic, without causing packet drops or further network disruptions.

- The current logic does not encorporate `Checksum` recalculation but we plan on integrating that soon.

# Introducing Support for IPv4 and IPv6 as Gadget Parameters

Initially, there was no support for accepting IP parameters directly as inputs for the gadget., we introduced support for both IPv4 and IPv6 addresses as parameters.

#### Parsing and Storing IP Addresses

The first step in the process was updating the `Start` function in the `pkg/operators/ebpf/ebpf.go` file. This function is responsible for processing the parameters passed to the eBPF program. We needed to ensure that when the program encounters an IP address, it can differentiate between IPv4 and IPv6. Using Go's `net.IP` type, we wrote logic to check whether the IP address is IPv4 or IPv6 and store it accordingly.

```C
if ip := ipParam.To4(); ip != nil {
    ipAddr.Version = 4
    copy(ipAddr.V6[:4], ip)  // Store the first 4 bytes for IPv4 in the V6 field
} else if ip := ipParam.To16(); ip != nil {
    copy(ipAddr.V6[:], ip)   // Store the full 16 bytes for IPv6
    ipAddr.Version = 6
} else {
    return fmt.Errorf("invalid IP address: %v", ipParam)
}

```

#### The `L3Endpoint` Struct

To store both IPv4 and IPv6 addresses in a consistent format, we created a new struct called `L3Endpoint` in the `pkg/operators/ebpf/types/types.go` file. The struct holds a 16-byte array (`V6`) for the IP address and an 8-bit `Version` field to indicate whether the address is IPv4 or IPv6:

```C
type L3Endpoint struct {
    V6      [16]byte  // IPv6 address (also used for IPv4)
    Version uint8     // 4 for IPv4, 6 for IPv6
    _       [3]byte   // Padding for alignment
}

```

#### Type Hinting for IP Parameters

To ensure that the eBPF program recognizes when a parameter is an IP address, we updated the type hinting system. Specifically, we modified the `getTypeHint` function in the `pkg/operators/ebpf/params.go` file to return `params.TypeIP` for the `L3Endpoint` type. This tells the program that the parameter should be treated as an IP address.


```C
switch typedMember.Name {
case ebpftypes.L3EndpointTypeName:
    return params.TypeIP
}

```

This change ensures that when the eBPF program encounters a parameter of type `L3Endpoint`, it knows the data is an IP address and processes it accordingly.

#### Setting Default Values for IP Addresses

Finally, we needed to ensure that there are sensible default values for IP addresses in case no specific address is provided. In the `pkg/operators/ebpf/params_defaults.go` file, we set the default value for IPv4 to `0.0.0.0`. This ensures that the system has a valid IP address (even if it's just the default) when no address is specified.

```C
case *btf.Struct:
    switch t.Name {
    case ebpftypes.L3EndpointTypeName:
        defaultValue = "0.0.0.0"  // Default value for IPv4
    }

```

This ensures that if no IP address is provided, the system defaults to `0.0.0.0` for IPv4 addresses, ensuring the program can continue running without errors.

# DNS Delay Gadget

In the world of network performance testing and chaos engineering, introducing artificial delays can be an invaluable tool. One of the ways this can be done is by delaying specific network packets, such as DNS (Domain Name System) packets, to test how systems behave under network latency.

The challenge here was to develop an eBPF-based gadget that can delay DNS packets (UDP packets on port 53) without affecting other types of network traffic. The gadget should:

    Identify DNS packets in both IPv4 and IPv6 formats.
    Introduce a delay in the timestamp of these packets before they leave the system.
    Maintain efficiency and minimize overhead.


### Exploring Packet Delay in eBPF: Challenges and Solutions

When working with eBPF, implementing a delay for network packets can be challenging due to several constraints, particularly when it comes to functions like `tc` or `xdp` programs, which cannot sleep. The typical approach of introducing a sleep or delay in the code isn't feasible in these contexts due to eBPF's limitations. However, there are alternative solutions available that make use of other kernel features, such as timers and queuing mechanisms.

#### Issue 1: eBPF Programs Can't Sleep

The first issue we encounter when trying to delay packets using eBPF is the fact that eBPF programs, like XDP (eXpress Data Path), are not designed to be sleepable. This means we cannot directly use traditional methods like `sleep()` to introduce delays. One potential solution here is the use of `bpf_timers`, which allows us to manage timeouts or delays within the kernel space, although it requires some careful handling.

#### Issue 2: Storing Packets Temporarily

now altough `bpf_timers` offer a potential solution, another challenge arises when attempting to store packets temporarily for later reinjection after a delay. To achieve this, we would need to store the packets in a map, and this necessitates the ability to uniquely identify each packet. Additionally, we must consider the feasibility of how many packets can be stored in the map at once, and whether packets beyond the capacity of the map should be dropped.

One limitation in this approach is that we cannot store the `skb` (socket buffer) structure directly in the map. Therefore, a solution involves copying the packet into the map and then dropping the original packet, ensuring that it can be reinjected later after the delay. Given that DNS packets, the target for this approach, have a maximum size of 512 bytes, this architecture becomes viable for small packets like these.

#### Attempting a Busy Wait with eBPF

An important part of the delay mechanism is the ability to pause or introduce a "busy wait." However, eBPF's verifier imposes strict limitations on loops and certain control flow constructs, preventing us from implementing traditional busy-wait mechanisms. Various methods such as mathematical calculations, switch statements, and goto constructs were explored, but the verifier would reject these due to the complexity of the timing behavior they introduce.

#### Community Insights and the **FQ qdisc** Solution

After exploring these options and hitting roadblocks, we reached out to the ebpf community for guidance. One helpful response pointed to the current limitations in eBPF, explaining that kernel developers have not yet added features to support packet delays solely within eBPF programs. Instead, the recommended approach involves using eBPF to interact with existing logic, specifically the FQ (Fair Queueing) qdisc, which can be used to manage packet delays.

As explained, while eBPF itself doesn't support delaying packets directly, you can instruct the kernel to delay packets using the FQ qdisc by setting the delay time in the eBPF program. Cilium, a popular networking project, leverages this approach by configuring the delay time in eBPF and relying on the kernel's FQ qdisc to handle the actual packet queuing and delay.

##### Limitations of the FQ qdisc Approach

The FQ qdisc method does come with a couple of important limitations.

- _First_, it only works on egress traffic, meaning it cannot be used for ingress packet delays. 
 
- _Second_, the maximum delay that can be introduced is 1 second by default. This is due to the _"drop horizon"_ feature in the FQ qdisc, which ensures that packets delayed beyond a certain threshold are dropped to prevent excessive queuing. The default value for this drop horizon is 1 second, but there is ongoing exploration into whether this value can be adjusted.

Despite these limitations, the FQ qdisc approach is still viable for many use cases, especially when a small delay is sufficient, such as in DNS traffic, where delays on the order of 1 second are often acceptable.


#### **The Final Approach:**

After considering several approaches, we decided to implement a **traffic classifier eBPF program** attached to the egress hook at the **FQ qdisc** . This program would:

1.  **Inspect Network Packets:** It would inspect the Ethernet, IP, and UDP headers to identify DNS packets based on the port number (53).

2.  **Introduce a Delay:** Upon identifying DNS packets, we would capture the current time, add a predefined delay (500 ms), and then modify the packet's timestamp (`skb->tstamp`) to simulate network latency using the FQ (Fair Queueing) qdisc. The **FQ qdisc** handles the actual queuing and delay of packets, ensuring efficient and controlled packet delay.

3.  **Track and Log Events:** Additionally, we implemented an optional system to track events using an eBPF map to store metadata about the delayed packets, such as the source and destination IPs, process information, and timestamps. This is kept optional as the information collection would introduce overhead.

The key decision was to use eBPF because it allows for direct manipulation of packets in the kernel, leading to high performance with minimal overhead.

#### **Explanation of the Code:**

Now, let's take a closer look at the core parts of the implementation, specifically the eBPF program that handles packet classification and delay introduction.

**delay_ns:**

At the start of the code, we define some essential constants and include the necessary headers. The constant `delay_ns` is set to 500 milliseconds (500,000,000 nanoseconds) and is used to simulate the delay.

```C
const volatile __u64 delay_ns = 500000000; // 500ms in nanoseconds
```

**Main Packet Processing Logic:**

The main logic is contained in the function `delay_dns_packets`, which is attached to the egress traffic classifier (`SEC("classifier/egress/drop")`). It processes the packet, checks if it's a DNS packet, and if so, introduces the delay.

1.  **Packet Parsing:** First, we parse the Ethernet, IPv4, and IPv6 headers to ensure the packet is valid and identify the protocol.

    ```C
    struct ethhdr *eth = data;
    struct iphdr *ip4h;
    struct ipv6hdr *ip6h;

    if ((void *)(eth + 1) > data_end) {
        return TC_ACT_OK; // Eth headers incomplete - Let them pass through
    }

    switch (bpf_ntohs(eth->h_proto)) {
    case ETH_P_IP: // IPv4 Processing

    ```

2.  **Handling IPv4 DNS Packets:** If the packet is IPv4 and the protocol is UDP, we check the source and destination port. If the port is 53 (DNS), we modify the timestamp to simulate the delay.

    ```C
    if(ip4h->protocol == IPPROTO_UDP) {
        struct udphdr *udph = (struct udphdr *)((__u8 *)ip4h + (ip4h->ihl * 4));

        if (bpf_ntohs(udph->dest) == 53 || bpf_ntohs(udph->source) == 53) {
            __u64 current_time = bpf_ktime_get_ns();
            skb->tstamp = current_time + delay_ns; // Add delay to timestamp
            ...
        }
    }

    ```

3.  **Handling IPv6 DNS Packets:** Similarly, for IPv6 packets, we check if the packet is UDP with port 53 and introduce the delay.

    ```C
    case ETH_P_IPV6: // IPv6 Processing
        ip6h = (struct ipv6hdr *)(eth + 1);
        if(ip6h->nexthdr == IPPROTO_UDP) {
            struct udphdr *udph = (struct udphdr *)(ip6h + 1);
            if (bpf_ntohs(udph->dest) == 53 || bpf_ntohs(udph->source) == 53) {
                __u64 current_time = bpf_ktime_get_ns();
                skb->tstamp = current_time + delay_ns; // Add delay to timestamp
                ...
            }
        }
        break;

    ```

4.  **Logging the Event:** Once a DNS packet is identified and delayed, we store the event in the `events_map` using the destination address and port as the key. We also enrich the event with process information, network namespace ID, and the delay.

    ```C
    bpf_map_update_elem(&events_map, &key, &event, BPF_NOEXIST);
    ```

> Still need to improve the gadget to take the URL as the gadget parameter

This delay gadget can be useful for simulating DNS latency in network testing, chaos engineering, and performance benchmarking.


## Improvements that are still undergoing/plan to do

- checksum correction in bit_flip gadget
- URL parameter for DNS gadget
- Dynamic configuration of the parameters by maintaining a map

## System Chaos failures

The initial concept was to simulate system call failures based on specific criteria:

1.  **Container or Process**: This could be achieved by using the `mount_id` as a gadget parameter.
2.  **Syscall**: We focused on intercepting specific syscalls by attaching eBPF programs at the respective kprobes.

Once intercepted, we could use functions like `bpf_override_return()` or `bpf_send_signal()` to either return an error code when a system call is made or kill the process executing the syscall. Additionally, we could gather statistics using the gadget's buffer.

However, we now plan to integrate this system chaos feature with ongoing work on event generation. The goal is to provide more than just observability, as there can be significant overhead when combining chaos engineering with event generation. This integration faces several challenges:

-   **Limitations of eBPF**: Not all functionality can be implemented directly within eBPF.
-   **Runtime Configurability**: Some actions may need to be configurable during runtime.
-   **Injection and Manipulation**: The system needs to support both injection and manipulation, which requires creating a new class of gadgets to handle these actions efficiently.

This integration will enable us to create more dynamic and configurable chaos engineering tools while maintaining the flexibility needed for event generation.


## Mentorship Experience

I am incredibly grateful to my mentors, [Michael Friese](https://github.com/flyth) and [Mauricio Vásquez Bernal](https://github.com/mauriciovasquezbernal), for their exceptional guidance and support throughout the LFX Mentorship Program. They were patient, understanding, and always willing to address my questions—no matter how small—despite their busy schedules. Their flexibility and encouragement made it easier to navigate the project alongside my academic commitments. I deeply appreciated how they pushed me to improve my communication skills and actively engage with the community, fostering both my technical and interpersonal growth. Their unwavering support and constructive feedback were instrumental in making this mentorship an enriching and enjoyable experience. I have nothing but the utmost gratitude for their time, effort, and belief in my potential. Thank you for being amazing mentors!


# Conclusion

In this blog, we reviewed the chaos gadgets implemented and the thought process behind their development. If there is scope for improvement of logic or requirement of more customization, feel free to reach us out.

For more details, check out the [Inspektor Gadget’s repository](https://github.com/inspektor-gadget/inspektor-gadget). If you encounter any issues while creating your test files don’t hesitate to reach out on [Slack](https://kubernetes.slack.com/messages/inspektor-gadget/). We’re always happy to help!

Happy Inspekting! 
