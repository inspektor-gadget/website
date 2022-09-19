+++
authors = ["Alban Crequy"]
date = "2020-03-18T12:00:00+02:00"
description = "Writing Kubernetes network policies with Inspektor Gadget’s Network Policy Advisor"
draft = false
tags = ["kubernetes", "inspektor-gadget", "bpf", "security"]
title = "Writing Kubernetes network policies with Inspektor Gadget’s Network Policy Advisor"
topics = ["containers", "security"]
postImage = "pietro-jeng.jpg"
original_link = "https://kinvolk.io/blog/2020/03/writing-kubernetes-network-policies-with-inspektor-gadgets-network-policy-advisor/"
+++

At KubeCon EU 2016 in London, I gave [a first talk about using BPF and
Kubernetes together](https://www.youtube.com/watch?v=67SyRpBja2I). I was
presenting a proof of concept to introduce various degraded network scenarios
in specific pods for testing the reliability of apps. There was not a lot of
BPF + Kubernetes talks back then. In the meantime, Kinvolk has worked on
various projects mixing Kubernetes and BPF together. The latest such project is
our own [Inspektor Gadget](https://github.com/kinvolk/inspektor-gadget), a
collection of “gadgets” for debugging and inspecting Kubernetes applications.

Today I would like to introduce Inspektor Gadget’s newest gadget that helps to
write proper Kubernetes network policies.

## Writing Kubernetes network policies easily

Securing your Kubernetes clusters is a task that involves many aspects:
controlling what goes into your container images, writing RBAC rules for
different users and services, etc. Here I focus on one important aspect:
network policies.

At Kinvolk we regularly do security assessments of Kubernetes in the form of
penetration testing for customers. Sometimes, the application is Kubernetes
native and the network policies are developed at the same time as the
application. This is ideal because the development team has a clear idea of
which pod is supposed to talk to which pod. But sometimes, a pre-Kubernetes
application is ported to Kubernetes and the developer tasked with writing the
network policies may not have a clear idea of the architecture. Architecture
documents might be missing or incomplete. Adding pod security as an
afterthought might not be ideal, but thankfully the Network Policy Advisor in
Inspektor Gadget can help us here.

### The Network Policy Advisor workflow

A workflow we suggest that can improve things is to deploy the application in a
development cluster and let Inspektor Gadget monitor and analyse the network
traffic so it can suggest network policies. The developer can then review the
output and add them in the project.

We will use GoogleCloudPlatform’s microservices-demo application as an example.
Its
[kubernetes-manifests.yaml](https://github.com/GoogleCloudPlatform/microservices-demo/blob/master/release/kubernetes-manifests.yaml)
contains various deployments and services but no network policies.

After preparing a “demo” namespace, let’s ask Inspektor Gadget to monitor the
network traffic from this namespace:

```
$ kubectl gadget network-policy monitor \
        --namespaces demo \
        --output ./networktrace.log
```

While it’s running in the background, deploy the application in the demo
namespace from another terminal:

```
$ wget -O network-policy-demo.yaml https://raw.githubusercontent.com/GoogleCloudPlatform/microservices-demo/ccff406cdcd3e043b432fe99b4038d1b4699c702/release/kubernetes-manifests.yaml
$ kubectl apply -f network-policy-demo.yaml -n demo
```

Once the demo is deployed and running correctly, we can see all the pods in the
demo namespace:

```
$ kubectl get pod -n demo
NAME                                     READY   STATUS    RESTARTS   AGE
adservice-58c85c77d8-k5667               1/1     Running   0          44s
cartservice-579bdd6865-2wcbk             0/1     Running   1          45s
checkoutservice-66d68cbdd-smp6w          1/1     Running   0          46s
currencyservice-65dd85f486-62vld         1/1     Running   0          45s
emailservice-84c98657cb-lqwfz            0/1     Running   2          46s
frontend-788f7bdc86-q56rw                0/1     Running   1          46s
loadgenerator-7699dc7d4b-j6vq6           1/1     Running   1          45s
paymentservice-5c54c9887b-prz7n          1/1     Running   0          45s
productcatalogservice-7df777f796-29lmz   1/1     Running   0          45s
recommendationservice-89547cff8-xf4mv    0/1     Running   1          46s
redis-cart-5f59546cdd-6rq8f              0/1     Running   2          44s
shippingservice-778db496dd-mhdk5         1/1     Running   0          45s
```

At this point, the different pods will have communicated with each other. The
networktrace.log file contains one line per TCP connection with enough details
to be able to infer network policies later on.

Let's stop the network monitoring by Inspektor Gadget using Ctrl-C, and
generate the Kubernetes network policies:

```
$ kubectl gadget network-policy report \
        --input ./networktrace.log > network-policy.yaml
```

Note: Here we are running Inspektor Gadget as a kubectl subcommand. You could
also run it as a stand-alone binary using `inspektor-gadget` instead.

One of the network policies it creates is for the cartservice: Inspektor Gadget
noticed that it received connections from the frontend and initiated
connections to redis-cart. It displays the following suggestion accordingly:

```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  creationTimestamp: null
  name: cartservice-network
  namespace: demo
spec:
  egress:
  - ports:
    - port: 6379
      protocol: TCP
    to:
    - podSelector:
        matchLabels:
          app: redis-cart
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - port: 7070
      protocol: TCP
  podSelector:
    matchLabels:
      app: cartservice
  policyTypes:
  - Ingress
  - Egress
```

As you can see, it converted the set of connection tuples into a set of network
policies using usual Kubernetes label selectors instead of IP addresses.

Of course, those automatically-produced network policies should not be used
blindly: a developer should verify that the connections observed are
legitimate. The Network Policy Advisor gadget has some limitations too (see
[#39](https://github.com/kinvolk/inspektor-gadget/issues/39)), but it’s a lot
easier to review them and possibly make some small changes, rather than writing
them from scratch with a frustrating trial and error development cycle. This
saves precious development time and likely costs too.

## Conclusion

Inspektor Gadget has useful features for developers of Kubernetes applications.
As an Open Source project, contributions are welcome. Join the discussions on
the #inspektor-gadget channel in the Kubernetes Slack or, if you want to know
about our services related to pentesting and security, reach us at
[hello@kinvolk.io](mailto:hello@kinvolk.io).
