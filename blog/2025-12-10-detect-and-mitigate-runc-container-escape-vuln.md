---
authors: ["alban-crequy", "rodrigo-campos"]
title: "Detect and mitigate runc container escape vulnerabilities with Inspektor Gadget"
description: "Detect and mitigate runc container escape vulnerabilities with Inspektor Gadget"
draft: false
tags: ["inspektor-gadget", "bpf", "security", "runc"]
slug: /2025/12/detect-and-mitigate-runc-container-escape-vuln
image: /media/2023-02-13-leveraging-oci-runtime-annotations-for-kubernetes-tooling.jpg
---

On November 5th 2025, the maintainers of the runc container runtime published three security advisories of high severity. Runc is a core component used to run containers. If you use Docker, Kubernetes, or other container platforms, runc is the default low-level runtime actually running each container on your computer or server. One of the CVEs, [CVE-2025-31133](https://github.com/opencontainers/runc/security/advisories/GHSA-9493-h29p-rfm2) identified a container escape scenario. This means a malicious user could craft a container image that, when started, escapes out of its container, gaining access to the underlying host system. This means that someone running a hostile or compromised container could potentially run code on the physical or virtual machine itself, not just inside the container.

<!-- truncate -->

Hopefully everyone managed to upgrade to a fixed version by now. If not, the security advisories also list several possible mitigations such as using user namespaces. Bear in mind that the best course of action is to upgrade runc to a fixed version. This blog post proposes an alternative possible mitigation for [CVE-2025-31133](https://github.com/opencontainers/runc/security/advisories/GHSA-9493-h29p-rfm2) based on eBPF using Inspektor Gadget. The beauty of using eBPF for security is that we can easily get kernel-level visibility in a safe and performant way. This is also an opportunity to demonstrate how eBPF programs can easily be shared and deployed with Inspektor Gadget. If you're new to Inspektor Gadget, please check out [Empowering Observability: The Advent of Image-Based Gadgets](https://inspektor-gadget.io/blog/2024/08/empowering-observability_the_advent_of_image_based_gadgets) where you can learn about gadgets and the Inspektor Gadget framework.

With Inspektor Gadget you can implement eBPF driven security measures on your system in many different ways. In this blog post we show all the options and how they compare to one another, so you can choose what is best for your setup. In particular, we show how to:

- Run our gadget in non-Kubernetes environments
- Run our gadget on Kubernetes without installing Inspektor Gadget
- Run our gadget on Kubernetes with Inspektor Gadget installed
- Monitor and alert if the gadget detects the vulnerability is being exploited

Finally, everything we have shown is not specific to our gadget. You can write your own gadgets. We will give pointers on how to do so (Hello World tutorial).

## The gadget: runc-vuln-detector

Our gadget is available:

- Sources on GitHub: [https://github.com/alban/runc-vuln-detector](https://github.com/alban/runc-vuln-detector)
- OCI image: [ghcr.io/alban/runc-vuln-detector:latest](https://github.com/alban/runc-vuln-detector/pkgs/container/runc-vuln-detector)

Gadgets are just eBPF code compiled in an OCI image and any OCI registry can be used to store them. To learn more about how to build, push, pull and inspect gadgets as OCI images, check the [Handling gadgets](https://inspektor-gadget.io/docs/latest/reference/images) documentation.

## How is the gadget implemented?

The gadget detects and mitigates several runc CVEs. This blog post focuses on [CVE-2025-31133](https://github.com/opencontainers/runc/security/advisories/GHSA-9493-h29p-rfm2).

For this CVE, we added eBPF code that detects if the `/dev/null` file that is used in a mount call (the system call that makes a filesystem available in the container) is the expected device (a char device with major/minor `1:3`). If it's not, it informs Inspektor Gadget and sends a SIGKILL to the process doing so. This effectively kills the runc process before the container can be started.

To make sure we do not kill any unexpected programs, we also check that the program doing this is runc. This way you can deploy it safely knowing that only runc processes, and nothing else, will be killed in your cluster.

## Run our gadget in non-Kubernetes environments

In normal conditions, the [kernel keyring](https://www.man7.org/linux/man-pages/man7/keyrings.7.html) is not available from a container:

```bash
$ docker run -ti --rm busybox cat /proc/keys | wc -l
0
```

Due to CVE-2025-31133, a container workload can access the kernel keyrings `/proc/keys`. We omit the instructions to reproduce the exploit here, because it is a recent security vulnerability.

```bash
$ docker run (hidden-arguments)
# The exploit would print the content of /proc/keys from the host here
```

This can be detected by the gadget:

```bash
$ sudo -E ig run ghcr.io/alban/runc-vuln-detector:latest --verify-image=false --fields=comm,cve,details,reason
WARN[0000] gadget signature verification is disabled due to using corresponding option
WARN[0002] gadget signature verification is disabled due to using corresponding option
COMM             CVE               DETAILS     REASON
runc             CVE_2025_31133    /dev/null   REASON_PROCFS_PATH_MISMATCH
```

Alternatively, this can be blocked by the gadget with the `--kill` parameter:

```bash
$ sudo -E ig run ghcr.io/alban/runc-vuln-detector:latest --verify-image=false --fields=comm,cve,details,reason --kill
WARN[0000] gadget signature verification is disabled due to using corresponding option
WARN[0002] gadget signature verification is disabled due to using corresponding option
COMM             CVE               DETAILS     REASON
runc:[2:INIT]    CVE_2025_31133    /dev/null   REASON_PROCFS_PATH_MISMATCH
```

The container is stopped in this way:

```bash
$ docker run (hidden-arguments)
docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: %!w(<nil>): unknown.
```

The vulnerability is not specific to `/proc/keys`. The same could be achieved with [`/proc/kcore`](https://www.man7.org/linux/man-pages/man5/proc_kcore.5.html) or other files.

## Run our gadget on Kubernetes without installing Inspektor Gadget

For testing on a single node without installing Inspektor Gadget:

```bash
$ kubectl debug --profile=sysadmin node/minikube -ti \
        --image=ghcr.io/inspektor-gadget/ig:latest -- \
        ig run ghcr.io/alban/runc-vuln-detector:latest \
        --verify-image=false --fields=comm,cve,details,reason
COMM             CVE                               DETAILS                           REASON
runc             CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
runc             CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
runc             CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
runc             CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
runc             CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
runc             CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
```

The problematic workload was started with:

```bash
$ kubectl apply -f pod.yaml # hidden content
```

Alternatively, this can be blocked by the gadget with the --kill parameter:

```bash
$ kubectl debug --profile=sysadmin node/minikube -ti \
        --image=ghcr.io/inspektor-gadget/ig:latest -- \
        ig run ghcr.io/alban/runc-vuln-detector:latest \
        --verify-image=false --fields=comm,cve,details,reason \
        --kill
COMM             CVE                               DETAILS                           REASON
runc:[2:INIT]    CVE_2025_31133                    /dev/null                         REASON_PROCFS_PATH_MISMATCH
```

The container is stopped in this way:

```bash
$ kubectl describe pod test-pod
...
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  15s                default-scheduler  Successfully assigned default/test-pod to minikube
  Normal   Pulled     13s                kubelet            Successfully pulled image "busybox" in 1.187747515s (1.187753075s including waiting)
  Normal   Pulling    12s (x2 over 14s)  kubelet            Pulling image "busybox"
  Normal   Created    11s (x2 over 13s)  kubelet            Created container busybox
  Warning  Failed     11s (x2 over 13s)  kubelet            Error: failed to start container "busybox": Error response from daemon: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: %!w(<nil>): unknown
```

## Run our gadget on Kubernetes with Inspektor Gadget installed

To learn how to install Inspektor Gadget on Kubernetes, refer to the [Installing on Kubernetes](https://inspektor-gadget.io/docs/latest/reference/install-kubernetes) documentation. In summary, we have used the following command:

```bash
$ kubectl gadget deploy --verify-image=false --otel-metrics-listen=true
```

Run the gadget with the following command:

```bash
$ kubectl gadget run \
    ghcr.io/alban/runc-vuln-detector:latest \
    --fields=comm,cve,details,reason
COMM           CVE             DETAILS   REASON
runc:[2:INIT]  CVE_2025_31133  /dev/null REASON_PROCFS_PATH_MISMATCH
```

This is running the gadget in interactive mode and this will only be deployed on the existing nodes. Nodes created afterwards (e.g. with the Cluster Autoscaler) won't be monitored.

Alternatively, the gadget could be deployed in a non-interactive mode with a manifest file. In this case, the gadget will be deployed on all nodes, including those created afterwards by the Cluster Autoscaler.

```bash
$ cat > manifest.yaml <<EOF
apiVersion: 1
kind: instance-spec
image: ghcr.io/alban/runc-vuln-detector:latest
name: runc-vuln-detector
paramValues:
  operator.oci.ebpf.kill: "true"
  operator.cli.fields: comm,cve,details,reason
EOF
$ kubectl gadget run --detach -f manifest.yaml
INFO[0000] installed as "fb20bc58666709934a61dffa3ad8a388"
$ kubectl gadget list
ID            NAME                 TAGS  GADGET                    STATUS
fb20bc586667  runc-vuln-detector         ghcr.io/alban/runc-vuln-… Running
```

## Monitor and alert if the gadget detects the vulnerability is being exploited

Inspektor Gadget enables gadgets to export metrics. When configured appropriately, Inspektor Gadget exposes Prometheus metrics from its running gadgets. We'll add two changes compared to the previous configuration:

- Deploy Inspektor Gadget with the option: `--otel-metrics-listen=true`
- Add a parameter to the gadget manifest to specify which metrics it should expose

```bash
$ cat > manifest.yaml <<EOF
apiVersion: 1
kind: instance-spec
image: ghcr.io/alban/runc-vuln-detector:latest
name: runc-vuln-detector
paramValues:
  operator.oci.ebpf.kill: "true"
  operator.otel-metrics.otel-metrics-name: runcwatcher:runcwatcher
EOF
$ kubectl gadget run --detach -f manifest.yaml
```

You can verify that metrics are correctly exposed with the following command:

```bash
$ POD_NAME=$(kubectl get pods -n gadget -o jsonpath="{.items[0].metadata.name}")
$ kubectl -n gadget port-forward $POD_NAME 2224:2224 &
$ curl http://localhost:2224/metrics -s | grep ^runcwatcher
runcwatcher_total{cve="CVE_2025_31133",otel_scope_name="runcwatcher",otel_scope_schema_url="",otel_scope_version="",reason="REASON_PROCFS_PATH_MISMATCH"} 2
```

## Conclusion

Inspektor Gadget is a tool that goes beyond observability and monitoring and allows you to deploy any eBPF program at scale in your cluster. You can deploy an existing gadget or your own eBPF code and Inspektor Gadget takes care of applying it to all your nodes.

We hope that this mitigation of the runc vulnerability inspires you to start writing your own gadgets for your own needs and use Inspektor Gadget in the future to deploy other eBPF programs! Don't hesitate to check the ["Hello world gadget" tutorial](https://inspektor-gadget.io/docs/latest/gadget-devel/hello-world-gadget). We look forward to continuing the conversation on [Slack](https://kubernetes.slack.com/archives/CSYL75LF6), please join us!
