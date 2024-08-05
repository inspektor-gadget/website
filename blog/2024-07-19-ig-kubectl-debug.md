---
authors: [francis-laniel]
description: "Using ig on Kubernetes, without installation, thanks to kubectl debug"
draft: false
tags: ["eBPF", "bpf", "inspektor gadget", "arm64", "arm"]
title: "Using ig on Kubernetes, without installation, thanks to kubectl debug"
slug: /2024/07/using-ig-on-kubernetes-without-installation-thanks-to-kubectl-debug
image: /media/ig-kubectl-debug.jpg
---

Inspektor Gadget can be used on Kubernetes (k8s) clusters in several ways:

- as a one-off debugging command for specific k8s nodes with [`kubectl-debug`](https://inspektor-gadget.io/docs/latest/getting-started/quick-start/#quick-start-on-kubernetes),
- as a long-term monitoring solution feeding into bespoke tools, logging services or industry standard tools like [Prometheus](https://inspektor-gadget.io/docs/latest/guides/prometheus/),
- as an interactive tool across a k8s cluster using [`kubectl-gadget`](https://inspektor-gadget.io/docs/latest/getting-started/install-kubernetes/#installing-kubectl-gadget)
- or as a [golang package](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/examples/README.md) integrated in your application.

In this blog post, we will focus on using Inspektor Gadget as a one-off debugging command with [`kubectl debug`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/).
This command permits debugging specific k8s nodes in an interactive way.

<!--truncate-->

It does not come with debugging tools, instead it relies on specifying any container image which will be deployed as a debugging container for the command lifetime.
As `ig` is also available as a [container image](https://github.com/inspektor-gadget/inspektor-gadget/pkgs/container/ig), we can leverage this to run it through `kubectl debug`:

```bash
$ kubectl debug --profile=sysadmin node/minikube-docker -ti --image=ghcr.io/inspektor-gadget/ig -- ig trace exec
Creating debugging pod node-debugger-minikube-docker-c2wfw with container debugger on node minikube-docker.
If you dont see a command prompt, try pressing enter.
RUNTIME.CONTAINERNAME          PID              PPID             COMM             RET ARGS
k8s_shell_shell_default_b4ebb… 3186934          3186270          cat              0   /bin/cat file
```

# `ig` requirements to run eBPF programs

To run eBPF programs and enrich generated events, `ig` needs to run as a privileged process.
Particularly, it relies on several [capabilities](https://linux.die.net/man/7/capabilities) offered by the Linux kernel.
The Linux kernel capabilities are means to restrain privileges given to tasks, instead of having globally privileged task.
For example, a task having `CAP_KILL` can send signal to others.
In the case of `ig`, we rely, among others, on [`CAP_SYS_ADMIN`](https://github.com/inspektor-gadget/inspektor-gadget/blob/e8c9955a7af1de1c052e9f4037927094127cc921/charts/gadget/templates/daemonset.yaml#L106-L127).

# Initial run of `ig` through `kubectl debug`

At first, it was not possible to easily use `ig` with `kubectl debug`, as the second was lacking a privileged execution profile.
To cope with this, we added a workaround to run `ig` as a [`systemd` unit](https://github.com/inspektor-gadget/inspektor-gadget/commit/a65dbbc6bcfdaa65376cf1955edc2c26dbb72332#diff-d6b4dbebf753ac89f982745ac89513f5f3b09ec334f96c72253383bbf865be3fR76-R208).
This way, `ig` would benefit the privileges it lacks while running through `kubectl debug`.
So, users ran `ig` with the following command:

```bash
$ kubectl debug node/minikube-docker -ti --image=ghcr.io/inspektor-gadget/ig -- ig --auto-sd-unit-restart trace exec
Creating debugging pod node-debugger-minikube-docker-c2wfw with container debugger on node minikube-docker.
If you dont see a command prompt, try pressing enter.
CONTAINER                                                     PID        PPID       COMM             RET ARGS
k8s_test01_test01_default_0aca2685-a8d2-49c7-9580-58fb806270… 1802638    1800551    cat              0   /bin/cat README
```

# Upstream work to add the `sysadmin` profile to `kubectl debug`

We then decided to improve `kubectl debug` by adding a privileged profile, as this was needed by `ig` and it could be used generally useful for other tools.
So, we opened a [PR](https://github.com/kubernetes/kubernetes/pull/119200) to add the `sysadmin` profile to `kubectl debug`.
The review process of this PR highlighted that the initial Kubernetes Enhancement Proposal (KEP) should be updated.
Indeed, the KEP proposed the `sysadmin` profile to only have `CAP_SYS_ADMIN` while using `privileged` would be a better fit.
So, we also opened a [PR](https://github.com/kubernetes/enhancements/pull/4234) to update the corresponding KEP.
With this PR being merged, we were able to merge the first PR, adding the `sysadmin` profile to `kubectl debug`.

# Removing `ig` workaround

The `sysadmin` profile feature would land in `kubectl debug` [1.30.0](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.30.md).
In the meantime, we worked on removing the `systemd`-based workaround we had in `ig`, the final goal was to use the following command to run `ig`:

```bash
$ kubectl debug --profile=sysadmin node/minikube-docker -ti --image=ghcr.io/inspektor-gadget/ig -- ig trace exec
```

Sadly, while testing, we realized we had some issues with the `list-containers` command.
Particularly, this command did not rely on the host filesystem to find the container runtime socket path.
We opened a [PR](https://github.com/inspektor-gadget/inspektor-gadget/pull/3030) to fix this [behavior](https://github.com/inspektor-gadget/inspektor-gadget/commit/51612b513af24624b32b5b2677cafd69a0d24ca8).
Note that, the previous commit, as well as [another commit](https://github.com/inspektor-gadget/inspektor-gadget/commit/99f1f2afe8cdd3d0f99a9d660a42c6e5c77900f9) written for another contribution enabled us to [remove](https://github.com/inspektor-gadget/inspektor-gadget/commit/606af855de2c6e84680546ba27c70f02727d4bee) the need of mounting `/run` as a volume when running `ig` in a container.

With this bug fixed, it was then time to [remove](https://github.com/inspektor-gadget/inspektor-gadget/commit/9fd572e2b58eb95b4652704f57516a83cdb4310d) the whole `--auto-sd-unit-restart` workaround.

# Conclusion

With this work, you can now simply run `ig` through `kubectl debug` using the following command:

```bash
$ kubectl debug --profile=sysadmin node/minikube-docker -ti --image=ghcr.io/inspektor-gadget/ig -- ig trace exec
Creating debugging pod node-debugger-minikube-docker-c2wfw with container debugger on node minikube-docker.
If you dont see a command prompt, try pressing enter.
RUNTIME.CONTAINERNAME          PID              PPID             COMM             RET ARGS
k8s_shell_shell_default_b4ebb… 3186934          3186270          cat              0   /bin/cat file
```

This work showcased the importance of an "upstream-first" mentality.
Indeed, it is now easier for people to run `ig` and `kubectl debug` gained a useful new debug feature.

## Acknowledgments

This work would not have been possible without the advice and reviews coming from the following people: [Alban Crequy](https://github.com/alban), [Arda Güçlü](https://github.com/ardaguclu), [josemotafbn](https://github.com/josemotafbn), [kfox1111](https://github.com/kfox1111), [Gerard de Leeuw](https://github.com/lion7), [Keita Mochizuki](https://github.com/mochizuki875), [Maciej Szulik](https://github.com/soltysh) and [Lee Verberne](https://github.com/verb).
We thank them all for this!
