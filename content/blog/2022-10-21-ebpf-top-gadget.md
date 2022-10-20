+++
authors = ["alban-crequy"]
date = "2022-10-21T10:00:00+02:00"
description = "Measuring CPU usage of eBPF programs with Inspektor Gadget"
draft = false
tags = ["eBPF", "bpf", "performance", "CPU", "memory", "top", "Inspektor Gadget", "gadget"]
title = "Measuring CPU usage of eBPF programs with Inspektor Gadget"
postImage = "2022-10-21-ebpf-top-gadget-header.jpg"
+++

Inspektor Gadget uses eBPF to inspect Linux systems and can be
especially helpful on Kubernetes clusters. One question often asked
before using Inspektor Gadget in production is how much CPU and memory
resources it uses. This question has been difficult to answer because
there was no easy way to check the resource consumption of eBPF
programs. Kubernetes has tools to measure CPU usage of pods (kubectl
top, metrics-server, cAdvisor, see [Kubernetes
documentation](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/))
but those tools don't measure eBPF programs. This is because eBPF
programs run in the Linux kernel and not in userspace processes and thus
cannot be directly associated with Kubernetes resources.

Linux 5.1 implemented a new feature to collect statistics on eBPF
programs (see description in Quentin Monnet's [blog
post](https://qmonnet.github.io/whirl-offload/2021/09/23/bpftool-features-thread/#programs-statistics)).
These statistics can be fetched by bpftool. However, bpftool is not
Kubernetes aware, so it's still difficult to collect those statistics on
a Kubernetes cluster.

That's where the new ebpf top gadget comes in. It reuses the same
mechanism as bpftool but exposes the data directly in the kubectl
command. It shows statistics for eBPF programs from Inspektor Gadget and
from any other project using eBPF like Cilium or Falco.

In this blog post, I will show the results of the top-ebpf gadget for
three projects using eBPF programs on Kubernetes:

1. Inspektor Gadget itself
2. Falco
3. Cilium

## Inspektor Gadget

Let's start two gadgets on an AKS cluster to see how they perform: the
seccomp advisor gadget and the trace-open gadget.

```bash
$ kubectl gadget advise seccomp-profile start --podname normal-pod-mv855
$ kubectl gadget trace open
```

Then, let's make a pod run a busy loop:

```bash
$ kubectl exec -ti normal-pod-mv855 -- sh -c "while true ; do cat /dev/null ; done"
```

Now, observe the resource consumption of eBPF programs for 10 seconds:

```bash
$ kubectl gadget top ebpf \
        -o custom-columns=progid,type,name,pid,comm,mapmemory,cumulruncount,cumulruntime \
        --sort cumulruntime \
        --timeout 10
PROGID   TYPE             NAME             PID     COMM                      MAPMEMORY CUMULRUNCOUNT CUMULRUNTIME
1203     RawTracepoint    ig_seccomp_e     27805   gadgettracerman              509KiB       1873670   1.2693767s
1205     TracePoint       ig_open_x        27805   gadgettracerman              212KiB         14848   215.5186ms
1204     TracePoint       ig_open_e        27805   gadgettracerman              212KiB         14848    18.4793ms
1206     TracePoint       ig_openat_e      27805   gadgettracerman              212KiB         36647    10.1631ms
1207     TracePoint       ig_openat_x      27805   gadgettracerman              212KiB         36648     3.9473ms
1062     CGroupSKB                         1       systemd                         44B             0           0s
1057     CGroupSKB                         1       systemd                         44B             0           0s
1058     CGroupSKB                         1       systemd                         44B             0           0s
1059     CGroupSKB                         1       systemd                         44B             0           0s
1060     CGroupSKB                         1       systemd                         44B             0           0s
1061     CGroupSKB                         1       systemd                         44B             0           0s
```

We can distinguish the eBPF programs used by Inspektor Gadget: they are
attached to the process gadgettracermanager and we recently renamed all
eBPF programs with the prefix `ig_` to make sure users can distinguish
different gadgets. The seccomp gadget uses more CPU than the trace-open
gadget. That's understandable because seccomp needs to observe all the
system calls whereas trace-open only needs to observe `open()` and
`openat()`.

Let's stop the busy loop in the pod and observe the resource consumption
again:

```bash
$ kubectl gadget top ebpf \
        -o custom-columns=progid,type,name,pid,comm,mapmemory,cumulruncount,cumulruntime \
        --sort cumulruntime \
        --timeout 10
PROGID   TYPE             NAME             PID     COMM                      MAPMEMORY CUMULRUNCOUNT CUMULRUNTIME
1203     RawTracepoint    ig_seccomp_e     27805   gadgettracerman              509KiB        340671   207.0367ms
1206     TracePoint       ig_openat_e      27805   gadgettracerman              212KiB         37446     10.252ms
1207     TracePoint       ig_openat_x      27805   gadgettracerman              212KiB         37445      3.995ms
1058     CGroupSKB                         1       systemd                         44B             0           0s
1059     CGroupSKB                         1       systemd                         44B             0           0s
1062     CGroupSKB                         1       systemd                         44B             0           0s
1057     CGroupSKB                         1       systemd                         44B             0           0s
1204     TracePoint       ig_open_e        27805   gadgettracerman              212KiB             0           0s
1205     TracePoint       ig_open_x        27805   gadgettracerman              212KiB             0           0s
1060     CGroupSKB                         1       systemd                         44B             0           0s
1061     CGroupSKB                         1       systemd                         44B             0           0s
```

As expected with less system calls, the eBPF programs are executed less
often than in the first experiment. Note that both the seccomp and the
trace-open eBPF programs used some resources even though the pods in the
default namespace didn't run anything. This is because the eBPF programs
are attached to the system calls globally, and they still need to check
if they are executed in the context of a pod selected by the pod
selector specified in the command line or not.

With top-ebpf, Kubernetes administrators can measure whether Inspektor
Gadget resource consumption is acceptable or not. The answer might be
different depending on the chosen gadgets and whether they are running
permanently or occasionally.

## Falco

For this experiment, we used an AKS cluster with a single node running
Linux 5.4. We have contributed [a
patch](https://github.com/falcosecurity/libs/pull/559) to give suitable
names to Falco's eBPF programs. To benefit from this patch, we use the
Falco and Falco libs from the master branches at these commits:

- Falco, commit 574a4b9f0aa0f8ccaa40a3e41d7659316b5f6b38
- Falco libs, commit 6dec2858c7660f46dbe4bb02d8d801b642eefb08

```bash
$ kubectl gadget top ebpf \
        -o custom-columns=progid,type,name,pid,comm,mapmemory,cumulruncount,cumulruntime \
        --sort cumulruntime \
        --timeout 10
PROGID   TYPE             NAME             PID     COMM                      MAPMEMORY CUMULRUNCOUNT CUMULRUNTIME
1326     RawTracepoint    sys_exit         17626   falco                      31.88KiB        319243   171.8727ms
1325     RawTracepoint    sys_enter        17626   falco                      31.88KiB        319046   155.0668ms
1328     RawTracepoint    sched_switch     17626   falco                      23.88KiB         64380    92.4077ms
1329     RawTracepoint    page_fault_user  17626   falco                      23.88KiB         78504     6.6047ms
1327     RawTracepoint    sched_process_e  17626   falco                      23.88KiB           360      647.8µs
1331     RawTracepoint    signal_deliver   17626   falco                      23.88KiB           568        302µs
1330     RawTracepoint    page_fault_kern  17626   falco                      23.88KiB          1449        243µs
1213     RawTracepoint    sys_open_e       17626   falco                      1.597MiB             0           0s
1211     RawTracepoint    sys_single       17626   falco                      1.597MiB             0           0s
1212     RawTracepoint    sys_single_x     17626   falco                      1.597MiB             0           0s
1057     CGroupSKB                         1       systemd                         44B             0           0s
1214     RawTracepoint    sys_open_x       17626   falco                      1.597MiB             0           0s
1215     RawTracepoint    sys_read_x       17626   falco                      1.597MiB             0           0s
1216     RawTracepoint    sys_write_x      17626   falco                      1.597MiB             0           0s
1217     RawTracepoint    sys_poll_e       17626   falco                      1.597MiB             0           0s
1218     RawTracepoint    sys_poll_x       17626   falco                      1.597MiB             0           0s
1219     RawTracepoint    sys_readv_pread  17626   falco                      1.597MiB             0           0s
1220     RawTracepoint    sys_writev_e     17626   falco                      1.597MiB             0           0s
1221     RawTracepoint    sys_writev_pwri  17626   falco                      1.597MiB             0           0s
1222     RawTracepoint    sys_nanosleep_e  17626   falco                      1.597MiB             0           0s
```

Here we observe something interesting: all the eBPF programs named after
system calls (e.g. `sys_open_e`) don't have CPU stats, even though there
was of course system calls executed during the 10 seconds of this
experiments. This is because Falco makes use of tail calls. The kernel
does not actually measure the CPU consumption of individual eBPF
programs but measure chains of eBPF programs. Here we have `sys_enter`
executing a tail call on `sys_open_e`, but all this time is accounting to
the first eBPF program to the point of attachment of the raw tracepoint.
Given that Falco heavily makes use of tail calls, this somewhat limits
the usefulness of top-ebpf, but this will still be useful for measuring
performance changes, for example between the current eBPF module and the
new modern eBPF module based on CO-RE.

## Cilium

For this experiment, we've used Cilium v1.13.0-rc0 on Minikube v1.26.1
with the following command:

```bash
$ minikube start --network-plugin=cni --cni=false
$ cilium install --version v1.13.0-rc0
```

I generated some network traffic in some pods, and I got the following
results.

```bash
$ kubectl gadget top ebpf \
        -o custom-columns=progid,type,name,pid,comm,mapmemory,cumulruncount,cumulruntime \
        --sort cumulruntime
PROGID   TYPE             NAME             PID     COMM            MAPMEMORY CUMULRUNCOUNT CUMULRUNTIME
1085     SchedCLS         cil_from_host                              17.6MiB         36622 170.998549ms
50       LSM              restrict_filesy                              24KiB        237237 143.289403ms
1127     SchedCLS         cil_from_contai                            24.3KiB         33348 117.345734ms
1125     Tracing          ig_top_ebpf_it   534935  gadgettracerman       12B        384533  42.150638ms
1099     SchedCLS         cil_from_contai                            24.3KiB           295   5.111228ms
1096     SchedCLS         cil_from_contai                            24.3KiB            31    804.081µs
169      CGroupSKB                                                        0B             0           0s
165      CGroupSKB                                                        0B             0           0s
167      CGroupSKB                                                        0B             0           0s
168      CGroupSKB                                                        0B             0           0s
166      CGroupSKB                                                        0B             0           0s
221      CGroupSKB                         518673  systemd                0B             0           0s
222      CGroupSKB                         518673  systemd                0B             0           0s
224      Tracing          dump_bpf_map                                  102B             0           0s
225      Tracing          dump_bpf_prog                                 102B             0           0s
1065     SchedCLS         cil_from_overla                           24.33KiB             0           0s
1070     SchedCLS         __send_drop_not                                32B             0           0s
1071     SchedCLS         tail_handle_ipv                           22.35MiB             0           0s
1072     SchedCLS         cil_to_overlay                                  0B             0           0s
1080     SchedCLS         cil_to_host                                  24KiB             0           0s
```

Cilium started to give names to its eBPF programs with the prefix cil_
since v1.13.0-rc0
([#19159](https://github.com/cilium/cilium/pull/19159)).

## Using top-ebpf without Kubernetes: local-gadget

Some of the gadgets in Inspektor Gadget can be used without Kubernetes
with local-gadget. This is the case with top-ebpf. Even though we've not
implemented a pretty UI yet, you can still give it a try with the
following commands:

```bash
$ sudo ./local-gadget interactive --runtimes docker
» create ebpftop trace1
» stream trace1 --follow
{"stats":[{"progid":50,"pids":[{"pid":1,"comm":"systemd"}],"name":"restrict_filesy","type":"LSM","totalRuntime":55801042,"totalRunCount":85641},...
```

## What's next

We hope this tool will be useful both for Kubernetes administrators to
evaluate the resource consumption of eBPF programs and for developers of
eBPF projects to improve performance.

Here are some features we're working on:

- Improve top-ebpf UI in local-gadget.
- Annotate SchedCLS programs with the name of the network interface and
  the Kubernetes pod it belongs to.
- Annotate CGroupSockAddr programs with the cgroup and the Kubernetes
  pod it belongs to.
- Display eBPF program metadata.

I'd like to thank the Falco team for helping me to run the experiments
and the Cilium team for helping me to understand how the eBPF statistics
work and for the cilium/ebpf library.
