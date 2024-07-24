---
authors: ["mauricio-vasquez"]

description: "Rewriting the Control Plane of BCC Tools in Golang"
draft: false
tags:
  ["eBPF", "bpf", "bcc", "CO-RE", "go", "golang", "Inspektor Gadget", "gadget"]
title: "Rewriting the Control Plane of BCC Tools in Golang"
slug: /2022/09/rewriting-the-control-plane-of-bcc-tools-in-golang
image: /media/2022-09-01-bcc-golang-controlplane-banner.jpg
---

Inspektor Gadget is a tool to debug and introspect Kubernetes
resources and applications. It's written in Golang and uses eBPF as the
building technology to get information from the host. Originally,
Inspektor Gadget was a wrapper around different
[BCC](https://github.com/iovisor/bcc/) tools: we executed the Python
scripts and parsed their output. Then we realized this approach did not
scale and was inflexible. For this reason, we decided to rewrite the
control plane of such tools directly in Golang, making it possible to
use those tools directly from our code base without having to execute an
external process. In this blog post, we'll describe the process we went
through for rewriting the control plane of the BCC tools in Golang, the
different blockers we faced and how we addressed them.

# Motivation

The BCC repository contains a very well-known set of eBPF-based tools to
trace system events. There are two kinds of tools in the repo: the
[tools](https://github.com/iovisor/bcc/tree/master/tools) folder
contains traditional tools written in Python that use the libbcc
infrastructure. In this case, programs are compiled on the target
machine before loading. The
[libbpf-tools](https://github.com/iovisor/bcc/tree/master/libbpf-tools)
folder contains new tools that are based on libbpf and use the [Compile
Once – Run Everywhere
(CO-RE)](https://nakryiko.com/posts/bpf-portability-and-co-re/)
mechanism. In the past, Inspektor Gadget was executing the "traditional"
tools and parsing their output. Given the advantages of using CO-RE, we
attempted the same idea with the libbpf-tools, but soon after we
realized it was very difficult to align and maintain the API between our
Golang program and the BCC program, for both, the CLI parameters and the
output format. Also, there was a considerable performance overhead by
executing and parsing the output of each tool. For these reasons, we
decided to rewrite the control plane (user space part) of those tools
directly in Golang.

# Choosing a Golang eBPF Library

The first step in this process was to choose which library to use. There
are three libraries we are aware of:
[iovisor/gobpf,](https://github.com/iovisor/gobpf/)[cilium/ebpf](https://github.com/cilium/ebpf:)
and [aquasecurity/libbpfgo.](https://github.com/aquasecurity/libbpfgo)
We decided to use cilium/ebpf, because it's well maintained, supports
CO-RE and doesn't use gco. It also provides
[bpf2go](https://pkg.go.dev/github.com/cilium/ebpf/cmd/bpf2go), a tool
that reduces the amount of manual work to interact with eBPF programs.

# Conversion Process

We followed these steps to convert the tools.

## Adapting the eBPF Code

We take the code from the BCC libbpf-tools and adapt it to our needs.
Specifically, we add the capability to filter by containers, using their
mount namespace inode id, as done
[here](https://github.com/inspektor-gadget/inspektor-gadget/commit/2fe54795311647b89d3e17a69f885f051706b392)
for the trace tcp gadget and
[here](https://github.com/inspektor-gadget/inspektor-gadget/commit/5c1ee18715b60d5182e217e5d3ef61be8921f8dd)
for top tcp. In some cases, we had to disable some features that weren't
supported by the cilium/ebpf library at the time we did the porting. For
instance, when we ported the trace bind gadget, there was no support for
`BPF_CORE_READ_BITFIELD_PROBED`, so we had to [comment
out](https://github.com/inspektor-gadget/inspektor-gadget/commit/e07760daa99bd3517315cfb56c23ae214dab8d66)
this code until support for that was
[implemented](https://github.com/cilium/ebpf/pull/573) in the library.

## Compiling the eBPF Code with bpf2go

bpf2go is the Golang counterpart of the bpf skeleton in bpftool: it
compiles a source eBPF file and generates some helper functions to open
and load those programs. Inspektor Gadget supports amd64 and arm64,
hence we use the -target option to define the platform that we're
compiling the eBPF program for. The "go:generate" line to compile the
gadgets looks like:

```go
//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -target ${TARGET} -cc clang execsnoop ./bpf/execsnoop.bpf.c -- I./bpf/ -I../../../../${TARGET}
```

The bpf2go model requires checking the compiled eBPF binaries into the
repository as they are embedded into the binary. Otherwise, the created
Golang packages for the gadgets won't be usable as the eBPF code will be
missing.

### (Re)Writing the User Space Logic

Now that we have our eBPF code ready and compiled, it's time to
implement the "control plane" of the tool. libbpf and cilium/ebpf
provide a similar set of APIs, however there are some differences that
we'll mention next.

#### Open, Load and Attach

The logic to open and load the programs in both libraries is very
similar. In Golang, we use the generated load function, like
`loadExecsnoop()`, that returns the collection spec, and then we use
`LoadAndAssign()` to load the programs and maps into the kernel.

The logic to attach the programs is a bit different as cilium/ebpf
doesn't provide an autoattach functionality. We instead have to use the
[link](https://pkg.go.dev/github.com/cilium/ebpf/link) package to attach
the programs one by one. This package provides different functions to
attach the different types of eBPF programs:

```go
// tracepoints
link.Tracepoint("syscalls", "sys_enter_execve",
	objs.TracepointSyscallsSysEnterExecve, nil)

// kprobes
link.Kprobe("inet_bind", t.objs.Ipv4BindEntry, nil)
link.Kretprobe("inet6_bind", t.objs.Ipv6BindExit, nil)
```

#### eBPF Constants

The support for global eBPF constants is different in both libraries. The skeleton generated by bpftool provides a rodata structure that we can directly set with the values:

```c
/* initialize global data (filtering options) */
obj->rodata->ignore_failed = !env.fails;
obj->rodata->targ_uid = env.uid;
obj->rodata->max_args = env.max_args;
```

On the cilium/ebpf library we need to use
[RewriteConstants()](https://pkg.go.dev/github.com/cilium/ebpf#CollectionSpec.RewriteConstants)
passing a map with the name and value of the constants.

```go
consts := map[string]interface{}{
	"filter_by_mnt_ns": filterByMntNs,
}

if err := spec.RewriteConstants(consts); err != nil {
	return fmt.Errorf("error RewriteConstants: %w", err)
}
```

#### Perf Buffers

Perf ring buffers are handled with the
[perf](https://pkg.go.dev/github.com/cilium/ebpf/perf) package. A reader
is created and then we have to call Read() within a loop.

```go
reader, err := perf.NewReader(t.objs.execsnoopMaps.Events, gadgets.PerfBufferPages*os.Getpagesize())
// …

for {
	record, err := t.reader.Read()
	// …
}
```

This is also a bit different from the libbpf implementation, where we
provide two callbacks and then poll the reader. One thing that needs
extra attention is the conversion of the received record into a type
that we can access. Currently we use cgo reusing the same header file
with the types definition in the eBPF and Golang programs. Then, we use
the unsafe Golang package to get a C pointer to the structure sent over
the buffer:

```go
eventC := (*C.struct_event)(unsafe.Pointer(&record.RawSample[0]))
```

Another possibility is to use the [generated
types](https://github.com/cilium/ebpf/tree/master/cmd/bpf2go#generated-types)
by bpf2go, but this is something we haven't explored yet.

### Access to Maps

The API provided by both libraries is rather similar. Simple operations
like update, lookup, delete are the same. However, cilium/ebpf provides
some abstractions like the
[MapIterator](https://pkg.go.dev/github.com/cilium/ebpf#MapIterator)
that make it easier to handle the maps in some situations.

### Missing Features

There are still some missing features in cilium/ebpf. For those cases we
had to implement some workarounds:

- [Reference kconfig variables in bpf using
  `__kconfig`](https://github.com/cilium/ebpf/issues/698): We implemented
  a
  [workaround](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.7.1/pkg/gadgets/profile/block-io/tracer/bpf/biolatency.bpf.c#L82-L86)
  for the lack of the `LINUX_KERNEL_VERSION` variable by compiling two
  different versions of the program and choosing which one to load at
  runtime based on the kernel version.
- [Reference kernel symbols using
  `__ksym`](https://github.com/cilium/ebpf/issues/761): In this case we
  had to declare a ksym as global variable in the [eBPF
  program](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.7.1/pkg/gadgets/top/ebpf/piditer/bpf/pid_iter.bpf.c#L9)
  and implement the
  [logic](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.7.1/pkg/gadgets/top/ebpf/piditer/iter.go#L59-L99)
  to get this value parsing /proc/kallsysms.

# Similar Effort

It's worth mentioning that there was a similar effort that we were not
aware of at the time we started this idea. [Go
libbpf-tools](https://github.com/marselester/libbpf-tools) contains a
Golang implementation of the execsnoop and tcpconnect tools. The whole
conversion process is detailed in the [BPF: Go frontend for
execsnoop](https://marselester.com/bpf-go-frontend-for-execsnoop.html)
and [BPF: Go frontend for
tcpconnect](https://marselester.com/bpf-go-frontend-for-tcpconnect.html)
blog posts. Even if the conversion process is quite similar, the goal
was very different. The intention of
[https://github.com/marselester/libbpf-tools](https://github.com/marselester/libbpf-tools)
is to provide executables written in Golang, while our intention was to
create packages that could be used from Inspektor Gadget.

# Conclusion

We finished the effort we initiated at the beginning of the year to port
our gadgets to have a control plane written in Golang. Now Inspektor
Gadget is more performant, flexible and easier to maintain. Also, we
found out that the Golang packages that we developed for Inspektor
Gadget are generic enough and can be used by other applications, we'll
writing about it in a future blog post.
