---
authors: [mauricio-vasquez]
description: "Introduction to Gadgets"
draft: false
tags: ["eBPF", "ig", "inspektor gadget", "Gadget"]
title: "Introduction to Gadgets"
slug: /2024/09/introduction-to-gadgets
image: /media/2024-09-30-header.jpg
---

Gadgets are the central component in [the Inspektor Gadget
framework](https://www.inspektor-gadget.io/blog/2024/08/empowering-observability_the_advent_of_image_based_gadgets).
A Gadget is an [OCI image](https://opencontainers.org/) that includes one or
more eBPF programs, metadata YAML file and, optionally, WASM modules for post
processing, etc. As OCI images, they use the same tooling as containers and
share the same attributes; shareable, modular, deployable, etc.

This blog post introduces the Gadget concept, explains how to run and create
them, and goes into their structure. It discusses the different ways Gadgets can
output information and provides links to documentation for Gadgets developers.

<!-- truncate -->

## Running a Gadget

Before going deep into the Gadget structure and other topics, let’s run some
Gadgets to get a feel for how they are used. You can find the documentation for
the Gadgets provided by us
[here,](https://www.inspektor-gadget.io/docs/latest/gadgets/) and you can check
[Artifact HUB](https://artifacthub.io/packages/search?kind=22) to get a more
complete list of Gadgets. We’ll use the ig binary, please check the
[instructions](https://www.inspektor-gadget.io/docs/latest/quick-start#install-locally)
to install it.

Gadgets are run by using the ig run command:

```bash
ig run gadget_image [flags]
```

Let’s start by running the
[top_tcp](https://www.inspektor-gadget.io/docs/latest/gadgets/top_tcp) Gadget to
print a sorted list of all TCP connections by received traffic (from highest to
lower) in the host.

```bash
$ sudo ig run top_tcp:latest --sort=-received --host
```

Then, in another window, run a container that downloads a large file:

```bash
$ docker run --rm --name mycontainer -it busybox wget <https://testfile.org/files-5GB-zip>
Connecting to testfile.org (172.64.80.1:443)
wget: note: TLS certificate validation not implemented
Connecting to testfileorg.jio.business (172.67.206.91:443)
saving to 'files-5GB-zip'
```

Then, go back to the first window and see how it prints a sorted list of TCP
connections that is updated each second.

```bash
$ sudo ig run top_tcp:latest --sort=-received --host
RUNTIME.CONTAINERNA…         PID SRC                         DST                         COMM       SENT       RECEIVED
mycontainer                33854 172.17.0.3:33860            172.67.206.91:443           wget       0          15692847
                            7621 2800:e2:f80:194e:ce71:d0f3… 2603:1063:2000::12:443      Chrome_Ch… 52588      3828
                            7621 2800:e2:f80:194e:ce71:d0f3… 2603:1036:2405:1::4:443     Chrome_Ch… 1319       3336
                            7621 2800:e2:f80:194e:ce71:d0f3… 2603:1063:2200::20:443      Chrome_Ch… 1325       570
                            7621 192.168.1.16:52386          20.189.173.28:443           Chrome_Ch… 2622       148
                            7621 2800:e2:f80:194e:ce71:d0f3… 2603:1063:2200:20::42:443   Chrome_Ch… 54568      117
                            7621 192.168.1.16:37848          52.123.190.205:443          Chrome_Ch… 58         47
```

We can see how the wget process on mycontainer is receiving a lot of traffic
from 172.67.206.91 (IP address of testfile.org), other connections coming from
Chrome as shown in the results as well. This specific Gadget is useful to debug
network saturation issues, as it shows us what process (and container) is sending
or receiving the most traffic on the host.

Please check the
[run](https://www.inspektor-gadget.io/docs/latest/reference/run) command
documentation to get more details.

## Gadget Structure

Gadgets are packaged in OCI images as defined by the [OCI
standard](https://github.com/opencontainers/image-spec/blob/main/spec.md). An
OCI image is composed of different layers and can support different
architectures and operating systems. Gadget creation is handled by the ig build
command.

![Gadget Diagram](/media/2024-08-06-gadget-diagram.svg)

Currently we support the following layers, but more may be added later.

### Metadata

The optional metadata file includes extra information about the gadget such as:

- Name
- Description
- Home, source and documentation URLs
- Datasources: List of datasources provided by the Gadget and configuration for
  their fields, like how to format when printing to the terminal, skip a
  specific field for json, etc.
- Parameters: Options exposed to the user to change the behavior of the gadget

The metadata file is stored as the configuration of the Gadget.

For instance, this is the metadata of the trace_open Gadget:


```yaml
name: trace open
description: trace open files
homepageURL: https://inspektor-gadget.io/
documentationURL: https://www.inspektor-gadget.io/docs/latest/gadgets/trace_open
sourceURL: https://github.com/inspektor-gadget/inspektor-gadget/tree/main/gadgets/trace_open
datasources:
  open:
    fields:
      timestamp_raw:
        annotations:
          columns.hidden: true
      timestamp:
        annotations:
          template: timestamp
      mntns_id:
        annotations:
          description: Mount namespace inode id
          template: ns
      comm:
        annotations:
          description: Process name
          template: comm
      pid:
        annotations:
          description: Process ID
          template: pid
      tid:
        annotations:
          description: Thread ID
          template: pid
      uid:
        annotations:
          description: User ID
          template: uid
      gid:
        annotations:
          description: Group ID
          template: uid
      flags_raw:
        annotations:
          columns.hidden: true
      flags:
        annotations:
          columns.hidden: true
          columns.width: 10
      mode_raw:
        annotations:
          columns.hidden: true
      mode:
        annotations:
          description: File access mode
      error_raw:
        annotations:
          columns.hidden: true
      fd:
        annotations:
          description: File descriptor. 0 in case of error
          columns.minwidth: 2
          columns.maxwidth: 3
          columns.alignment: right
      fname:
        annotations:
          columns.width: 32
          columns.minwidth: 24
ebpfParams:
  targ_failed:
    key: failed
    defaultValue: "false"
    description: Show only failed events
  targ_tgid:
    key: pid
    defaultValue: ""
    description: Show only events generated by processes with this pid
  targ_uid:
    key: uid
    defaultValue: ""
    description: Show only events generated by processes with this uid
```

### EBPF

The eBPF layer contains an ELF file with the eBPF programs used by the gadget.
This is generated by compiling the source eBPF code with Clang. Currently this
is the only mandatory layer.

### WASM

This layer contains an optional WASM module used for post-processing data and
overriding operators. Inspektor Gadget exposes an
[API](https://www.inspektor-gadget.io/docs/latest/gadget-devel/gadget-wasm-api-raw)
that can be used by modules written in any language, also a Golang
[wrapper](https://pkg.go.dev/github.com/inspektor-gadget/inspektor-gadget/wasmapi/go)
is provided.

### Btfgen

The btfgen layer contains BTF information for running gadgets in systems that
don’t provide it. Check our previous [BTFGen: One Step Closer to Truly Portable
eBPF
Programs](https://www.inspektor-gadget.io/blog/2022/03/btfgen-one-step-closer-to-truly-portable-ebpf-programs/)
blog post to learn more about this.

## Data sources

Data sources are a mechanism used by Gadgets to deliver information. A Gadget
can have one or more data sources. Inspektor Gadget supports different data
sources. In this blog post we’ll cover two types of data sources, in a follow up
we’ll cover others.

### Tracers

Tracers are data sources that provide a stream of events as they happen on the
system: a file is opened, a DNS request is performed, etc. These data sources
use a [perf ring
buffer](https://docs.kernel.org/next/userspace-api/perf_ring_buffer.html) or
[BPF ring buffer](https://docs.kernel.org/6.6/bpf/ringbuf.html) to transfer the
events from the eBPF program running in the kernel to the Inspektor Gadget
process in user-space.

There are multiple examples of Gadgets that provide a tracer data source, like
[trace_open](https://www.inspektor-gadget.io/docs/latest/gadgets/trace_open),
[trace_exec](https://www.inspektor-gadget.io/docs/latest/gadgets/trace_exec),
[trace_dns](https://www.inspektor-gadget.io/docs/latest/gadgets/trace_dns), etc.

Let’s test this by running
[trace_open.](https://www.inspektor-gadget.io/docs/latest/gadgets/trace_open)
This Gadget provides a stream of events when processes open files on the system.
To prepare, let’s run a container what will generate some events:

```bash
$ docker run --name test-trace-open -d busybox /bin/sh -c 'while /bin/true ; do whoami ; sleep 3 ; done'
```

And now run the trace_open Gadget

```bash
$ sudo ig run trace_open:latest
RUNTIME.CONTAI… COMM          PID     TID      UID      GID  FD FNAME                    MODE    ERROR
test-trace-open true        67370   67370        0        0   0 /etc/ld.so.cache         ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/x86_64-linux-gnu/g… ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/x86_64-linux-gnu/g… ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/x86_64-linux-gnu/t… ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/tls/x86_64/libm.so… ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/tls/x86_64/libm.so… ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/tls/libm.so.6       ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/x86_64/x86_64/libm… ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/x86_64/libm.so.6    ------… ENOEN
test-trace-open true        67370   67370        0        0   0 /lib/x86_64/libm.so.6    ------… ENOEN
test-trace-open true        67370   67370        0        0   3 /lib/libm.so.6           ------…
test-trace-open true        67370   67370        0        0   3 /lib/libresolv.so.2      ------…
test-trace-open true        67370   67370        0        0   3 /lib/libc.so.6           ------…
test-trace-open whoami      67371   67371        0        0   0 /etc/ld.so.cache         ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/g… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/g… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/t… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/t… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/t… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/t… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/x… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/x… ------… ENOEN
test-trace-open whoami      67371   67371        0        0   0 /lib/x86_64-linux-gnu/x… ------… ENOEN
```

It prints the path of the files being opened, the information of the process
performing that activity (comm, PID, TID) and information about the user, the
result of the operation and the file descriptor number are presented as well.
Additionally, the name of the container is shown.

### Map Iterators

Map Iterators are used to report statistics like number of files being opened,
bytes going through a network connection, etc. The information is saved by the
Gadget on hash maps where it's then read by Inspektor Gadget.

These Gadgets print the information to the CLI in intervals in different ways.
It’s possible to change the interval used to refresh the screen by using the
--map-fetch-interval flag, and to run the Gadget for a given number of
iterations by using --map-fetch-count.

These are some of the ways information coming from Map Iterators data sources
can be shown to the users.

#### Sorted List

The information is printed in a sorted list according to a specific field. This
output mode helps to understand what the field with the highest value is, for
instance, what’s the TCP connection with the most traffic, what’s the file that
is being read/written the most, etc. This is useful when we want to debug a
resource saturation issue as these Gadgets tell us who is doing those actions.
The top_tcp Gadget we showed above is one example of this kind of data source.

#### Histogram

Gadgets can output histograms to the CLI. This is useful in environments where
we don’t have a dashboard available, and we want to debug performance issues.

For instance, let’s run the profile_blockio Gadget that shows the latency of the
block-io operations on the system:

```bash
$ sudo ig run profile_blockio:latest
```

It’ll print a histogram with the latency distribution as:

```bash
latency
      µs               : count    distribution
       0 -> 1          : 0        |                                        |
       1 -> 2          : 0        |                                        |
       2 -> 4          : 0        |                                        |
       4 -> 8          : 4        |                                        |
       8 -> 16         : 11       |**                                      |
      16 -> 32         : 1        |                                        |
      32 -> 64         : 10       |*                                       |
      64 -> 128        : 0        |                                        |
     128 -> 256        : 0        |                                        |
     256 -> 512        : 2        |                                        |
     512 -> 1024       : 11       |**                                      |
    1024 -> 2048       : 1        |                                        |
    2048 -> 4096       : 213      |****************************************|
    4096 -> 8192       : 0        |                                        |
    8192 -> 16384      : 0        |                                        |
   16384 -> 32768      : 0        |                                        |
   32768 -> 65536      : 0        |                                        |
   65536 -> 131072     : 0        |                                        |
  131072 -> 262144     : 0        |                                        |
  262144 -> 524288     : 0        |                                        |
  524288 -> 1048576    : 0        |                                        |
 1048576 -> 2097152    : 0        |                                        |
 2097152 -> 4194304    : 0        |                                        |
 4194304 -> 8388608    : 0        |                                        |
 8388608 -> 16777216   : 0        |                                        |
16777216 -> 33554432   : 0        |                                        |
33554432 -> 67108864   : 0        |                                        |
```

Now, let's increase the I/O operations using the stress tool:

```bash
$ docker run -d --rm --name stresstest polinux/stress stress --io 10
```

The Gadget then will show that the number of I/O operations increased significantly.

```bash
latency
      µs               : count    distribution
       0 -> 1          : 0        |                                        |
       1 -> 2          : 0        |                                        |
       2 -> 4          : 0        |                                        |
       4 -> 8          : 202      |                                        |
       8 -> 16         : 13027    |*************************************   |
      16 -> 32         : 13833    |****************************************|
      32 -> 64         : 4272     |************                            |
      64 -> 128        : 876      |**                                      |
     128 -> 256        : 13       |                                        |
     256 -> 512        : 529      |*                                       |
     512 -> 1024       : 2913     |********                                |
    1024 -> 2048       : 720      |**                                      |
    2048 -> 4096       : 86       |                                        |
    4096 -> 8192       : 5        |                                        |
    8192 -> 16384      : 0        |                                        |
   16384 -> 32768      : 0        |                                        |
   32768 -> 65536      : 0        |                                        |
   65536 -> 131072     : 0        |                                        |
  131072 -> 262144     : 0        |                                        |
  262144 -> 524288     : 0        |                                        |
  524288 -> 1048576    : 0        |                                        |
 1048576 -> 2097152    : 0        |                                        |
 2097152 -> 4194304    : 0        |                                        |
 4194304 -> 8388608    : 0        |                                        |
 8388608 -> 16777216   : 0        |                                        |
16777216 -> 33554432   : 0        |                                        |
33554432 -> 67108864   : 0        |                                        |
```

### Snapshotters

Snapshotters are similar to map iterators, the difference is that the
information comes from eBPF iterators instead of maps. These Gadgets are used to
get a list of resources of a specific system, like the list of processes,
sockets, etc. For instance, the snapshot_process shows the list of processes
running on the system

```bash
$ sudo ig run snapshot_process:latest --host
WARN[0000] Ignoring runtime "cri-o" with non-existent socketPath "/run/crio/crio.sock"
WARN[0000] Ignoring runtime "podman" with non-existent socketPath "/run/podman/podman.sock"
RUNTIME.CONTAINERNAME    COMM                    PID           TID          UID          GID         PPID
                         systemd                   1             1            0            0            0
                         kthreadd                  2             2            0            0            0
                         pool_workque…             3             3            0            0            2
                         kworker/R-rc…             4             4            0            0            2
                         kworker/R-rc…             5             5            0            0            2
                         kworker/R-sl…             6             6            0            0            2
registry                 registry               3465          3465            0            0         3444
                         gdm-session-…          3519          3519            0         1001         1473
                         systemd                3529          3529         1001         1001            1
minikube                 systemd               10509         10509            0            0        10488
minikube                 systemd-jour…         10659         10659            0            0        10509
minikube                 sshd                  10705         10705            0            0        10509
minikube                 containerd            11329         11329            0            0        10509
minikube                 dockerd               11588         11588            0            0        10509
minikube                 cri-dockerd           11828         11828            0            0        10509
minikube                 kubelet               12067         12067            0            0        10509
minikube                 containerd-s…         12340         12340            0            0        10509
```

## Implementing a Gadget

This part of the blog post covers how to implement a Gadget. This guide will
implement a simplified version of the "trace open" Gadget.

The first step is to create an empty folder where the source code of the Gadget
will be stored:

```bash
$ mkdir mygadget
```

### Implementing the eBPF program

The eBPF code contains the source code for the programs that are injected in the
kernel to collect information. Let's create a file called program.bpf.c and put
the following contents in there.

The first thing we need is to include some header files.

```c
// Kernel types definitions
// Check https://blog.aquasec.com/vmlinux.h-ebpf-programs for more details
#include <vmlinux.h>

// eBPF helpers signatures
// Check https://man7.org/linux/man-pages/man7/bpf-helpers.7.html to learn
// more about different available helpers
#include <bpf/bpf_helpers.h>

// Inspektor Gadget buffer
#include <gadget/buffer.h>

// Inspektor Gadget macros
#include <gadget/macros.h>

// Inspektor Gadget filtering
#include <gadget/mntns_filter.h>

// Inspektor Gadget types
#include <gadget/types.h>
```

Then, we have to specify a structure with all the information our Gadget will
provide.

```c
#define NAME_MAX 255

struct event {
	gadget_mntns_id mntns_id;

__u32 pid;
	char comm[TASK_COMM_LEN];
	char filename[NAME_MAX];
};
```

Then, create a buffer eBPF map to send events to user space:

```c
// events is the name of the buffer map and 1024 * 256 is its size.
GADGET_TRACER_MAP(events, 1024 * 256);
```

This macro will automatically create a ring buffer if the kernel supports it.
Otherwise, a perf array will be created.

And define a tracer by using the GADGET_TRACER macro with the following parameters:

- Tracer's Name: open
- Buffer Map Name: events
- Event Structure Name: event

```c
// Define a tracer
GADGET_TRACER(open, events, event);
```

After that, we need to define a program that is attached to a hook that provides
the information we need, in this case we'll attach to a tracepoint that is
called each time the openat() syscall is executed.

First, this program checks if the current mount namespace inode id has to be
filtered out (this is used to implement filtering by containers), then it
collects the information to fill the event (only pid for now), and then calls
gadget_submit_buf() helper to send the event to user space.

```c
SEC("tracepoint/syscalls/sys_enter_openat")
int enter_openat(struct syscall_trace_enter *ctx)
{
	struct event *event;
	__u64 mntns_id;
	mntns_id = gadget_get_mntns_id();

	if (gadget_should_discard_mntns_id(mntns_id))
		return 0;

	event = gadget_reserve_buf(&events, sizeof(*event));
	if (!event)
		return 0;

	event->mntns_id = mntns_id;
	event->pid = bpf_get_current_pid_tgid() >> 32;
	bpf_get_current_comm(event->comm, sizeof(event->comm));
	bpf_probe_read_user_str(event->filename, sizeof(event->filename), (const char *)ctx->args[1]);

	gadget_submit_buf(ctx, &events, event, sizeof(*event));

	return 0;
}
```

Finally, it's needed to define the license of the eBPF code.

```c
char LICENSE[] SEC("license") = "GPL";
```

The full file should look like:

```c
// Kernel types definitions
// Check https://blog.aquasec.com/vmlinux.h-ebpf-programs for more details
#include <vmlinux.h>

// eBPF helpers signatures
// Check https://man7.org/linux/man-pages/man7/bpf-helpers.7.html to learn
// more about different available helpers
#include <bpf/bpf_helpers.h>

// Inspektor Gadget buffer
#include <gadget/buffer.h>

// Inspektor Gadget macros
#include <gadget/macros.h>

// Inspektor Gadget filtering
#include <gadget/mntns_filter.h>

// Inspektor Gadget types
#include <gadget/types.h>

#define NAME_MAX 255

enum flags_set {
	FOO = 0x01,
	BAR = 0x02,
};

struct event {
	gadget_mntns_id mntns_id;
	__u32 pid;
	char comm[TASK_COMM_LEN];
	char filename[NAME_MAX];
	__u32 uid;
	__u32 gid;
	enum flags_set flags_raw;
};

// events is the name of the buffer map and 1024 * 256 is its size.
GADGET_TRACER_MAP(events, 1024 * 256);

// [Optional] Define a tracer
GADGET_TRACER(open, events, event);

SEC("tracepoint/syscalls/sys_enter_openat")
int enter_openat(struct syscall_trace_enter *ctx)
{
	struct event *event;
	__u64 mntns_id;

	mntns_id = gadget_get_mntns_id();
	if (gadget_should_discard_mntns_id(mntns_id))
		return 0;

	event = gadget_reserve_buf(&events, sizeof(*event));
	if (!event)
		return 0;

	event->flags_raw = FOO | BAR;

	event->mntns_id = mntns_id;
	event->pid = bpf_get_current_pid_tgid() >> 32;

	__u64 uid_gid = bpf_get_current_uid_gid();
	event->uid = (__u32)uid_gid;
	event->gid = (__u32)(uid_gid >> 32);

	bpf_get_current_comm(event->comm, sizeof(event->comm));
	bpf_probe_read_user_str(event->filename, sizeof(event->filename),
				(const char *)ctx->args[1]);

	gadget_submit_buf(ctx, &events, event, sizeof(*event));

	return 0;
}

char LICENSE[] SEC("license") = "GPL";

```

### Building the Gadget for the first time

We can now compile our Gadget. You don't need to have any build tools installed
on the machine, the [image
build](https://www.inspektor-gadget.io/docs/latest/gadget-devel/building) by
default uses docker to run a container with all dependencies to compile the
code.

```bash
$ cd mygadget
$ sudo ig image build -t mygadget:latest .
Successfully built ghcr.io/inspektor-gadget/gadget/mygadget:latest@sha256:dd3f5c357983bb863ef86942e36f4c851933eec4b32ba65ee375acb1c514f628
```

We're now all set to run our Gadget for the first time.

```bash
$ sudo ig run mygadget:latest --verify-image=false
WARN[0000] image signature verification is disabled due to using corresponding option
WARN[0000] image signature verification is disabled due to using corresponding option
RUNTIME.CONTAINERNAME                              MNTNS_ID             PID        COMM                       FILENAME
```

By default, it only traces processes running on a container, so let’s start a
container that creates some events

```bash
$ docker run --name test-trace-open -d busybox /bin/sh -c 'while /bin/true ; do whoami ; sleep 3 ; done'
```

You’ll see how it prints events.

```bash
$ sudo ig run mygadget:latest --verify-image=false
WARN[0000] image signature verification is disabled due to using corresponding option
WARN[0000] image signature verification is disabled due to using corresponding option
RUNTIME.CONTAINERNAME                              MNTNS_ID             PID        COMM                       FILENAME
RUNTIME.CONTAINERNAME                              MNTNS_ID             PID        COMM                       FILENAME
test-trace-open                                    4026534227           63172      true                       /lib/tls/x86_64/libm.so.6
test-trace-open                                    4026534227           63172      true                       /lib/tls/x86_64/libm.so.6
test-trace-open                                    4026534227           63172      true                       /lib/tls/libm.so.6
test-trace-open                                    4026534227           63172      true                       /lib/x86_64/x86_64/libm.s…
test-trace-open                                    4026534227           63172      true                       /lib/x86_64/libm.so.6
test-trace-open                                    4026534227           63172      true                       /lib/x86_64/libm.so.6
test-trace-open                                    4026534227           63172      true                       /lib/libm.so.6
test-trace-open                                    4026534227           63172      true                       /lib/libresolv.so.2
test-trace-open                                    4026534227           63172      true                       /lib/libc.so.6
test-trace-open                                    4026534227           63173      whoami                     /etc/ld.so.cache
test-trace-open                                    4026534227           63173      whoami                     /lib/x86_64-linux-gnu/gli…
test-trace-open                                    4026534227           63173      whoami                     /lib/x86_64-linux-gnu/gli…
test-trace-open                                    4026534227           63173      whoami                     /lib/x86_64-linux-gnu/tls…
test-trace-open                                    4026534227           63173      whoami                     /lib/x86_64-linux-gnu/tls
```

The events are enriched as the Gadget was providing the mount namespace inode id.

### Creating a metadata file

The above formatting is not totally great, some columns are taking a lot of
space, like pid, others shouldn't be shown by default (mountns_id) and the
filename is being trimmed. The [metadata
file](https://www.inspektor-gadget.io/docs/latest/gadget-devel/metadata)
contains extra information about the Gadget, among other things, it can be used
to specify the format to be used.

An initial version of the metadata file can be created by passing
--update-metadata to the build command:

```bash
$ sudo ig image build . -t mygadget --update-metadata
```

It'll create a gadget.yaml file:

```yaml
name: 'TODO: Fill the gadget name'
description: 'TODO: Fill the gadget description'
homepageURL: 'TODO: Fill the gadget homepage URL'
documentationURL: 'TODO: Fill the gadget documentation URL'
sourceURL: 'TODO: Fill the gadget source code URL'
datasources:
open:
  fields:
    comm:
      annotations:
        description: 'TODO: Fill field description'
    filename:
      annotations:
        description: 'TODO: Fill field description'
    mntns_id:
      annotations:
        description: 'TODO: Fill field description'
    pid:
      annotations:
        description: 'TODO: Fill field description'
```

Let's edit the file to customize the output. We define some templates for
well-known fields like pid, comm, etc.

```yaml
name: mygadget
description: Example gadget
homepageURL: http://mygadget.com
documentationURL: https://mygadget.com/docs
sourceURL: https://github.com/my-org/mygadget/
datasources:
  open:
    fields:
      comm:
        annotations:
          description: Name of the process opening a file
          template: comm
      filename:
        annotations:
          description: Path of the file being opened
          columns.width: 64
      mntns_id:
        annotations:
          description: Mount namespace inode id
          template: ns
      pid:
        annotations:
          description: PID of the process opening a file
          template: pid
```

Now we can build and run the Gadget again

```bash
$ sudo ig image build . -t mygadget
...
$ sudo ig run mygadget:latest --verify-image=false
WARN[0000] image signature verification is disabled due to using corresponding option
WARN[0000] image signature verification is disabled due to using corresponding option
RUNTIME.CONTAINERNAME                      PID COMM             FILENAME
test-trace-open                          65708 true             /etc/ld.so.cache
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v3/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v2/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/tls/x86_64/x86_64/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/tls/x86_64/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/tls/x86_64/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/tls/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/x86_64/x86_64/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/x86_64/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/x86_64/libm.so.6
test-trace-open                          65708 true             /lib/x86_64-linux-gnu/libm.so.6
test-trace-open                          65708 true             /usr/lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v3/libm.so.6
test-trace-open                          65708 true             /usr/lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v2/libm.so.6
test-trace-open                          65708 true             /usr/lib/x86_64-linux-gnu/tls/x86_64/x86_64/libm.so.6
```

Now the output is much better.

Check out our
[documentation](https://www.inspektor-gadget.io/docs/latest/gadget-devel/) to
get more information on how to create a Gadget.

## Closing

This blog post explained the Gadget concept and presented examples of some basic
Gadgets and introduced the Gadget development process. We’ll follow up with
another blog posts covering advanced topics like WASM, Otel metrics, etc.
