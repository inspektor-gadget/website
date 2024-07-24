---
authors: ["qasim-sarfraz"]
description: "Minikube + Inspektor Gadget! <3"
draft: false
tags:
  [
    "container-runtime",
    "containerd",
    "cri-o",
    "minikube",
    "kubernetes",
    "Inspektor Gadget",
  ]
title: "Minikube + Inspektor Gadget! <3"
slug: /2023/08/minikube-inspektor-gadget-3
image: /media/2023-02-15-minikube-inspektor-gadget.jpg
---

**TL; DR**: Inspektor Gadget is now available as an [addon](https://minikube.sigs.k8s.io/docs/handbook/addons/inspektor-gadget/) in [Minikube](https://github.com/kubernetes/minikube).

When creating a tool for Kubernetes, it's crucial to be able to test it with various cluster configurations. In the case of Inspektor Gadget, we wanted to:

- Run it against a cluster of multiple [Kubernetes nodes](https://kubernetes.io/docs/concepts/overview/components/#node-components).
- Test it against different [container runtimes](https://kubernetes.io/docs/concepts/overview/components/#container-runtime). (`docker`, `containerd` and `cri-o`).
- Validate our changes locally without pushing the image to a container registry.
- Cover the above scenarios both in the development and in the Continuous Integration (CI) pipeline quickly.

With `minikube` we can start a cluster locally using `minikube start` and combining it with flags like `--container-runtime` or `--nodes` as needed.
We use the same flow to test our changes in [GitHub Actions](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/.github/workflows/inspektor-gadget.yml) as:

```yaml
test-integration-minikube:
    name: Integration Tests
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        runtime: [docker, containerd, cri-o]
    steps:
    - name: Setup minikube
      uses: ./.github/actions/setup-minikube
      with:
        runtime: ${{ matrix.runtime }}
        multi-node: true
    - name: Run integration tests
      uses: ./.github/actions/run-integration-tests
    . . .
    . . .
```

So `minikube` works great when developing and testing cloud-native applications. On the other hand, having a deeper understanding of the applications
when running in a `minikube` cluster would be fantastic and Inspektor Gadget might just be the right tool for it. To facilitate this,
now you can use the [inspektor-gadget addon](https://minikube.sigs.k8s.io/docs/handbook/addons/inspektor-gadget/) in minikube [v1.31.0](https://github.com/kubernetes/minikube/releases/tag/v1.31.0):

```bash
$ minikube addons enable inspektor-gadget
🌟  The 'inspektor-gadget' addon is enabled
$ kubectl get pods -n gadget
NAME           READY   STATUS    RESTARTS   AGE
gadget-zwln9   1/1     Running   0          19s
```

Afterward, you can interact with the cluster using [kubectl-gadget](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/docs/install.md#install-a-specific-release). Here is an example using the `tcp top gadget`:

```bash
$ kubectl gadget top tcp --all-namespaces
NODE       NAMESPACE       POD                      CONTAINER        PID      COMM          IP REMOTE  LOCAL  SENT          RECV
minikube   kube-system     kube-apiserver-minikube  kube-apiserver   762760   kube-apiserv… 6  :0      :0     68.29KiB      541B
minikube   kube-system     etcd-minikube            etcd             762749   etcd          4  :0      :0     47.61KiB      331B
minikube   kube-system     kube-apiserver-minikube  kube-apiserver   762760   kube-apiserv… 6  :0      :0     15.39KiB      117B
minikube   kube-system     kube-scheduler-minikube  kube-scheduler   762764   kube-schedul… 4  :0      :0     2.49KiB       564B
```

The list of gadgets is available [here](https://github.com/inspektor-gadget/inspektor-gadget#the-gadgets). Feel free to try the addon and share your valuable feedback. We would like to thank the
minikube maintainers for their reviews and **Santhosh Nagaraj (@yolossn)** for making it happen!

Happy Inspekting!
