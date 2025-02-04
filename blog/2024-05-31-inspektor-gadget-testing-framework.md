---
authors: [pranav-pawar]
description: "Introducing the New Testing Framework for Image-based Gadgets"
draft: false
tags:
  [
    "LFXMentorship",
    "InspektorGadget",
    "TestingFramework",
    "eBPF",
    "go",
    "golang",
    "gadget",
    "tests",
  ]
title: "Introducing the New Testing Framework for Image-based Gadgets"
slug: /2024/06/introducing-the-new-testing-framework-for-image-based-gadgets
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

Hola Inspektors! I was selected by [Alban Crequy](https://github.com/alban) and [Mauricio Vásquez Bernal](https://github.com/mauriciovasquezbernal) under the LFX mentorship program to develop a Testing Framework for Image-based Gadgets (Issue [#2046](https://github.com/inspektor-gadget/inspektor-gadget/issues/2046)).

In this blog, we will cover why this framework was needed and how you can use it to test your gadgets effectively, but before that let’s understand what Inspektor Gadget and Image-Based Gadgets are.

<!-- truncate -->

# What is Inspektor Gadget?

Inspektor Gadget is an eBPF tool and systems inspection framework for Kubernetes, containers, and Linux hosts. It maps low-level Linux resources to high-level concepts, like Kubernetes pods, containers, etc. You can use it as a standalone tool or integrate it into your existing tooling. With Inspektor Gadget, you have access to a variety of [built-in gadgets](https://www.inspektor-gadget.io/docs/latest/builtin-gadgets/), and you also have the flexibility to create your own.

# What are Image-Based Gadgets?

The image-based gadgets aim to make Inspektor Gadget a framework to run eBPF programs (gadgets), similar to how Docker uses container images to distribute and run applications. This approach allows gadgets to be developed outside the Inspektor Gadget project, allowing users to create custom gadgets catering to their needs but leveraging the functionality Inspektor Gadget provides.
Inspektor Gadget provides several commands to interact with image-based gadgets, you can check them out [here](https://www.inspektor-gadget.io/docs/latest/core-concepts/images/).

# Using the Testing Framework

After creating your gadget, it's essential to write a test file to verify its functionality. To simplify this process, Inspektor Gadget offers a testing framework, making it easy to write and run tests.

## Understanding the Testing Environments

Before diving into writing tests, it's crucial to understand the two environments where you can run gadgets:

- **Locally on the Host Machine:** Using the `ig` command.

- **In a Kubernetes Cluster:** Using the `kubectl-gadget` command.

## Selecting the Testing Environment

You can select the appropriate environment by setting two environment variables:

- **IG_PATH:** Specifies the path for the `ig` or the `kubectl-gadget` binaries. The default value is `ig`.

- **IG_RUNTIME:** Specifies the container runtime. Valid values are:

  - `docker`
  - `containerd`
  - `cri-o`
  - `kubernetes`

  The default value for `IG_RUNTIME` is `docker`.

## Configuring for Kubernetes

If `IG_PATH` includes `kubectl-gadget` and `IG_RUNTIME` is set to `kubernetes`, the framework assumes the gadget runs inside a Kubernetes cluster. Therefore, before running a test with these values, ensure you have a local Kubernetes cluster up and running with Inspektor Gadget deployed. If you're testing with a local Minikube cluster, you can follow the instructions on how to set up the development environment on Minikube [here](https://www.inspektor-gadget.io/docs/latest/devel/contributing/#development-environment-on-minikube).

## Writing Tests for Your Gadget

Let's dive into how you can create tests for your gadgets. We will illustrate the process by using an example test file, [trace_open_test.go](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/gadgets/trace_open/test/trace_open_test.go). The corresponding eBPF program for this test can be found [here](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.29.0/gadgets/trace_open/program.bpf.c). \
 \
The `trace_open_test.go` currently contains a single test that can be used for testing with both containers running locally and containers running in a Kubernetes cluster.

First, you need to import the necessary packages and create an event struct. This struct should include only the fields whose values you want to verify. You can set JSON tags by referring to the [gadget.yaml](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.28.1/gadgets/trace_open/gadget.yaml) file.

```go
import (
    "fmt"
    "testing"

    "github.com/stretchr/testify/require"

    gadgettesting "github.com/inspektor-gadget/inspektor-gadget/gadgets/testing"
    igtesting "github.com/inspektor-gadget/inspektor-gadget/pkg/testing"
    "github.com/inspektor-gadget/inspektor-gadget/pkg/testing/containers"
    igrunner "github.com/inspektor-gadget/inspektor-gadget/pkg/testing/ig"
    "github.com/inspektor-gadget/inspektor-gadget/pkg/testing/match"
    "github.com/inspektor-gadget/inspektor-gadget/pkg/testing/utils"
    eventtypes "github.com/inspektor-gadget/inspektor-gadget/pkg/types"
)

type traceOpenEvent struct {
    eventtypes.CommonData

    Uid   uint32 `json:"uid"`
    Gid   uint32 `json:"gid"`
    Comm  string `json:"comm"`
    Fd    uint32 `json:"fd"`
    Err   int32  `json:"err"`
    Flags int    `json:"flags"`
    Mode  int    `json:"mode"`
    FName string `json:"fname"`
}
```

\
**Initialize the Test:** We start the test by calling `InitTest(t)`, which reads the environment variables `IG_PATH` and `IG_RUNTIME`, and sets the `CurrentTestComponent` value accordingly. The possible values for `CurrentTestComponent` are:

- `IgLocalTestComponent`: Uses `ig` for running the gadget.
- `KubectlGadgetTestComponent`: Uses `kubectl-gadget` for running the gadget.

**Configure Container Options:** Create an array for container options. If using `KubectlGadgetTestComponent`, add options to set the namespace using `GenerateTestNamespace`, which appends a random number to the input string. Use the `WithContainerNamespace` option function to assign the namespace value to the `containerFactory`.

**Create a New Container using `containerFactory`:** Initialize a new container with the container name, the command to run inside the container, and the container options that we set before.

**Running the Container:** Start the container and ensure it stops at the end of the test using `t.Cleanup()`, which invokes the `Stop()` method after the test is completed.

**Note:** We use a `while` loop to run the command every 0.1 s inside the container until it is detected by the gadget when it is run later.

```go
func TestTraceOpen(t *testing.T) {
    utils.InitTest(t)

    containerFactory, err := containers.NewContainerFactory(utils.Runtime)
    require.NoError(t, err, "new container factory")
    containerName := "test-trace-open"
    containerImage := "docker.io/library/busybox:latest"

    var ns string
    containerOpts := []containers.ContainerOption{containers.WithContainerImage(containerImage)}

    if utils.CurrentTestComponent == utils.KubectlGadgetTestComponent {
        ns = utils.GenerateTestNamespaceName("test-trace-open")
        containerOpts = append(containerOpts, containers.WithContainerNamespace(ns))
    }

    testContainer := containerFactory.NewContainer(
        containerName,
        "while true; do setuidgid 1000:1111 cat /dev/null; sleep 0.1; done",
        containerOpts...,
    )

    testContainer.Start(t)
    t.Cleanup(func() {
        testContainer.Stop(t)
    })
```

## Setting the Runner, Common Data, and Testing Options

- **Runner Options:** Used to run the gadget using either `ig` or `kubectl-gadget`. Hence, different flags need to be applied.

- **Common Data Options:** Fields inside `eventtypes.CommonData` are automatically enriched by Inspektor Gadget. These fields vary depending on whether the gadget is run locally or inside a Kubernetes cluster.

- **Testing Options:** The framework provides various functions that can be useful to run before cleanup functions are called.

## Comparing the Output

To compare the actual output of the gadget with either an event struct, string, or a regular expression, specify the expected output using the `WithValidateOutput()` option function. Inside this function, you can use one of the match functions:

- `ExpectEntriesToMatch`: Verifies that all the entries in the expected entry are matched by at least one entry in the output.

- `ExpectStringToMatch`: Verifies that the output string matches the expected string. This function can be passed directly as an argument to `WithValidateOutput()`.

- `ExpectRegexpToMatch`: Verifies that the output string matches the expected regular expression. This function can be passed directly as an argument to `WithValidateOutput()`.

The `normalize` function is used to "normalize" the output, setting random value fields to their corresponding zero value. The framework provides the `NormalizeCommonData()` function to normalize fields enriched by Inspektor Gadget, but gadget-specific fields need to be handled by the user.

Finally, we create a new runner by specifying the gadget name and runner options, and run it using `RunTestSteps()`. The gadget repository and tag are added using the `GADGET_REPOSITORY` and `GADGET_TAG` environment variables.

```go
    var runnerOpts []igrunner.Option
    var testingOpts []igtesting.Option
    commonDataOpts := []utils.CommonDataOption{utils.WithContainerImageName(containerImage), utils.WithContainerID(testContainer.ID())}

    switch utils.CurrentTestComponent {
    case utils.IgLocalTestComponent:
        runnerOpts = append(runnerOpts, igrunner.WithFlags(fmt.Sprintf("-r=%s", utils.Runtime), "--timeout=5"))
    case utils.KubectlGadgetTestComponent:
        runnerOpts = append(runnerOpts, igrunner.WithFlags(fmt.Sprintf("-n=%s", ns), "--timeout=5"))
        testingOpts = append(testingOpts, igtesting.WithCbBeforeCleanup(utils.PrintLogsFn(ns)))
        commonDataOpts = append(commonDataOpts, utils.WithK8sNamespace(ns))
    }

    runnerOpts = append(runnerOpts, igrunner.WithValidateOutput(
        func(t *testing.T, output string) {
            expectedEntry := &traceOpenEvent{
                CommonData: utils.BuildCommonData(containerName, commonDataOpts...),
                Comm:       "cat",
                FName:      "/dev/null",
                Fd:         3,
                Err:        0,
                Uid:        1000,
                Gid:        1111,
                Flags:      0,
                Mode:       0,
            }

            normalize := func(e *traceOpenEvent) {
                utils.NormalizeCommonData(&e.CommonData)
            }

            match.ExpectEntriesToMatch(t, output, normalize, expectedEntry)
        },
    ))

    traceOpenCmd := igrunner.New("trace_open", runnerOpts...)

    igtesting.RunTestSteps([]igtesting.TestStep{traceOpenCmd}, t, testingOpts...)
}
```

## Running the Test

To run your test, ensure that you have set the `IG_PATH` and `IG_RUNTIME` environment variables appropriately. For example:

```bash
export IG_PATH="path/to/ig" # or "path/to/kubectl-gadget" if testing in a k8s cluster
export IG_RUNTIME="docker" # or "kubernetes" if testing in a k8s cluster

# [Optional] If running the test for a gadget whose image resides in a remote container registry
export GADGET_REPOSITORY=ghcr.io/my-org GADGET_TAG=latest

# Run the test
IG_EXPERIMENTAL=true go test -exec 'sudo -E' -v
```

# Conclusion

In this blog, we reviewed how to create a test to verify the functionality of the gadget across various environments. This testing framework advances Inspektor Gadget’s goal of providing a framework for building, packaging, and running gadgets, by allowing users to implement tests for their gadgets with ease. For more details, check out the [Inspektor Gadget’s repository](https://github.com/inspektor-gadget/inspektor-gadget). If you encounter any issues while creating your test files don’t hesitate to reach out on [Slack](https://kubernetes.slack.com/messages/inspektor-gadget/). We’re always happy to help!

Happy Inspekting!
