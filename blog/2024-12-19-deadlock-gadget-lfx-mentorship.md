---
authors: [snehil-shah]
description: "Introducing a new gadget for detecting deadlocks"
draft: false
tags: ["eBPF", "ig", "Inspektor Gadget", "Gadget", "WASM", "deadlock", "LFX Mentorship"]
title: "Introducing a new gadget for detecting deadlocks"
slug: /2024/12/deadlock-gadget-lfx-mentorship
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

Hey! I am [Snehil Shah](https://github.com/Snehil-Shah), a new inspektor in the community. Over these past few months, I have been working under the mentorship of [Alban Crequy](https://github.com/alban) and [Burak Ok](https://github.com/burak-ok) as part of the [LFX Mentorship](https://mentorship.lfx.linuxfoundation.org/project/7fdda09c-0eb8-466b-9fdf-e4b3c6a1d5b3) program.
Consider this blog a report on my work during the mentorship.

<!-- truncate -->

## What have I been up to?

My project involved developing a [new gadget](https://github.com/inspektor-gadget/inspektor-gadget/issues/3194) for detecting potential deadlocks in multi-threaded user space applications, using eBPF and WASM.

Debugging and preventing deadlocks in modern, complex codebases can be challenging. This gadget simplifies the process by identifying risks early, promoting safer and more efficient resource management.

## Who are Inspektors and what are they inspekting?

If you’re new here, welcome! [Inspektor Gadget](https://www.inspektor-gadget.io/) is a systems inspection framework leveraging eBPF-powered gadgets encapsulated into deployable [OCI images](https://opencontainers.org/) to provide powerful observability and debugging capabilities. Deploy it across various environments, from container runtimes to multi-node Kubernetes clusters, with everything you need to collect, filter, format and export valuable systems data. Check out some of these gadgets [here](https://www.inspektor-gadget.io/docs/latest/gadgets/). Moving on...

## What’s a deadlock?

A [deadlock](https://en.wikipedia.org/wiki/Deadlock_(computer_science)) in a system occurs when a process becomes stuck, unable to proceed because each thread (sub-process) is waiting for a resource that another thread is holding. Since none of the threads can continue, the system remains in a state of permanent lock-up unless some external action is taken.

Let’s take an example of a process with three mutexes and three threads.
A mutex (used for _mutual exclusion_) is an object used to control access to a mutable resource (variables, files, etc.) and can be locked by a thread to indicate that the resource is currently in use by that thread. If any other thread wants access to that resource, all they need to do is wait for the mutex to get unlocked. This ensures data consistency as no two threads modify the resource simultaneously.

Now let’s say we reach a state as depicted in the image.

![A diagram depicting a deadlock](/media/2024-12-19-deadlock-depiction.svg)

Thread 1, currently using mutex 1, requests access to lock mutex 2, but has to wait as mutex 2 is being used by thread 2. Now thread 2 requests access to mutex 3, but also has to wait as mutex 3 is being used by thread 3. Finally, thread 3 requests access to mutex 1, but has to wait as, in case you forgot, mutex 1 is being used by thread 1.
We have come full circle ending up with the threads being stuck in an infinite wait cycle due to mutex lock order inversions, thus hanging the process.

:::tip

The diagram above represents a directed graph. Keep reading to learn how we use it to detect these deadlocks.

:::

You can simulate a potential deadlock in code using the following C++ program adapted from [BCC tools](https://github.com/iovisor/bcc/blob/master/tools/deadlock_example.txt#L185):

```cpp
#include <chrono>
#include <iostream>
#include <mutex>
#include <thread>

std::mutex global_mutex1;
std::mutex global_mutex2;

int main(void) {
    static std::mutex static_mutex3;
    std::mutex local_mutex4;
    
    std::cout << "sleeping for a bit to allow trace to attach..." << std::endl;
    std::this_thread::sleep_for(std::chrono::seconds(10));
    std::cout << "starting program..." << std::endl;
    
    auto t1 = std::thread([] {
    std::lock_guard<std::mutex> g1(global_mutex1);
    std::lock_guard<std::mutex> g2(global_mutex2);
    });
    
    auto t2 = std::thread([] {
    std::lock_guard<std::mutex> g2(global_mutex2);
    std::lock_guard<std::mutex> g3(static_mutex3);
    });
    
    auto t3 = std::thread([&local_mutex4] {
    std::lock_guard<std::mutex> g3(static_mutex3);
    std::lock_guard<std::mutex> g4(local_mutex4);
    });
    
    auto t4 = std::thread([&local_mutex4] {
    std::lock_guard<std::mutex> g4(local_mutex4);
    std::lock_guard<std::mutex> g1(global_mutex1);
    });
    
    // Wait for the threads to finish execution..
    // WARNING! You might never reach this part of the code!
    t1.join();
    t2.join();
    t3.join();
    t4.join();
    
    std::cout << "sleeping to allow trace to collect data..." << std::endl;
    std::this_thread::sleep_for(std::chrono::seconds(5));
    std::cout << "done!" << std::endl;
}
```

:::warning

The above program can cause an actual deadlock. If stuck, kill the process using an interrupt like `SIGINT` or `SIGKILL`.

:::

## The Gadget

Inspektor Gadget recently unlocked support for uprobe based gadgets, as part of another LFX Mentorship project by fellow Inspektor [Tianyi Liu](https://github.com/i-Pear) in the spring term. Read more about it [here](https://www.inspektor-gadget.io/blog/2024/06/supporting-uprobe-based-gadgets-lfx-mentorship-report).

Using uprobes, we attach to the `pthread_mutex_lock` and `pthread_mutex_unlock` functions from the `pthread` library ie. POSIX threads (now integrated into the GNU’s standard `libc` library), as follows:

```c
SEC("uprobe/libc:pthread_mutex_lock")
int BPF_UPROBE(trace_uprobe_mutex_lock, void *mutex_addr)
{
    // Intercept it as you want!
}
```

[POSIX threads](https://man7.org/linux/man-pages/man7/pthreads.7.html) is the standard threading library on Unix-like systems, providing low-level control over thread creation, synchronization, and management.

Once attached, it now allows us to intercept and trace mutex acquisitions and releases as they happen. We then build a mutex wait directed graph of all mutexes and threads, the same one we saw above. A potential deadlock can then simply be detected by finding cycles in the directed graph.

Here’s a simple high level overview of how the gadget is detecting potential deadlocks:

![A flowchart depicting the deadlock detection process in the new gadget](/media/2024-12-19-deadlock-detection.svg)

This gadget detects "potential" deadlocks and not just actual deadlocks, as a deadlock that didn't happen during the trace could happen in the future.
A deadlock occurring depends on various factors such as thread scheduling and order of mutex acquisitions/releases, and hence it makes sense to report mutex lock order inversions as potentially unsafe resource management.

Let's understand lock order inversions and why it makes sense to report them, with an example consisting of two threads and two mutexes:

- In an ideal case, when threads want to lock several mutexes, they should always lock them in the same order:

    ```mermaid
    sequenceDiagram
        participant thread1
        participant thread2
        participant mutex1
        participant mutex2
    
    Note over thread1,mutex2: Correct lock order (mutex1 before mutex2)
        thread1 ->>+mutex1: lock
        thread1 ->>+mutex2: lock
        mutex2 ->>-thread1: unlock
        mutex1 ->>-thread1: unlock
    
        thread2 ->>+mutex1: lock
        thread2 ->>+mutex2: lock
        mutex2 ->>-thread2: unlock
        mutex1 ->>-thread2: unlock
    ```

    Here, both threads are locking the mutexes in the same order ie. starting with `mutex1`, and then `mutex2`.

- When the lock order is reversed, this becomes a "potential" deadlock. As discussed above, this **might** cause a deadlock. In the following example, we observe that the thread runs happened to have been scheduled in such way that no deadlock occurs (lucky day).

    ```mermaid
    sequenceDiagram
        participant thread1
        participant thread2
        participant mutex1
        participant mutex2
    
    Note over thread1,mutex2: Lock order reversal, potential deadlock
    
        thread1 ->>+mutex1: lock
        thread1 ->>+mutex2: lock
        mutex2 ->>-thread1: unlock
        mutex1 ->>-thread1: unlock
    
        thread2 ->>+mutex2: lock
        thread2 ->>+mutex1: lock
        mutex1 ->>-thread2: unlock
        mutex2 ->>-thread2: unlock
    ```

    In this other example though, even with the same lock order reversal, we were not so lucky with the timing, and an actual deadlock occurred.

    ```mermaid
    sequenceDiagram
        participant thread1
        participant thread2
        participant mutex1
        participant mutex2
    
    Note over thread1,mutex2: Lock order reversal, actual deadlock
    
        thread1 ->>+mutex1: lock
        thread2 ->>+mutex2: lock
    
        thread1 ->>mutex2: lock (waiting forever)
        thread2 ->>mutex1: lock (waiting forever)
        Deactivate mutex2
        Deactivate mutex1
    ```

And hence we can observe that, the same unsafe program run at two different times can show different behavior, justifying the need to report mutex lock order inversions as "potential" deadlocks.

Apart from `pthread_mutex_lock` and `pthread_mutex_unlock`, we are also attaching to a kernel tracepoint `sched/sched_process_exit` to clean up the buffers, maps, and graphs when a process dies, as a form of memory optimization.

That’s the new deadlock gadget for you. The gadget is adapted from [BCC’s deadlock detection tool](https://github.com/iovisor/bcc/blob/master/tools/deadlock.py). If you’re interested to learn more or try it out, check out the gadget [here](https://www.inspektor-gadget.io/docs/latest/gadgets/deadlock).

## What remains?

Currently, the gadget outputs the stack IDs of the user stack traces of when those mutexes, involved in the deadlock, were captured. But decoding those user stack traces remain a challenge. 

The current plan is to integrate the [`opentelemetry-ebpf-profiler`](https://github.com/open-telemetry/opentelemetry-ebpf-profiler) agent, that supports stack unwinding for multiple languages, as a package into Inspektor Gadget as per [this design doc](https://github.com/inspektor-gadget/inspektor-gadget/pull/3457). Here’s the [issue](https://github.com/open-telemetry/opentelemetry-ebpf-profiler/issues/33) tracking support for using Open Telemetry's eBPF profiler as a package in other OSS projects.

## The Experience

Time to end this with a quote:

> "Debugging deadlocks without tools is like playing musical chairs where everyone forgets the rules—chaotic, endless, and someone always loses. With our new gadget, you'll spot the troublemakers before the music even stops!"
>
> - ChatGPT 4o

Reflecting on these last few months, it has been an incredible learning endeavor into topics like eBPF, WebAssembly, Containers, and Linux kernel internals.
Special thanks to my amazing mentors for making it an easy one, and to LFX, the CNCF community, and the incredible folks at Inspektor Gadget for this opportunity.

As I graduate as an LFX mentee (and a fellow Inspektor), I walk away with valuable skills, experiences, and a community for life!