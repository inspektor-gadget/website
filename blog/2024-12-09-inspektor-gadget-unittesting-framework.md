---
authors: [sanskar-sharma]
description: "Introducing the New Unit Testing Framework for Image-based Gadgets"
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
    "unittest",
    "unit",
  ]
title: "Introducing a Unit Testing Framework for Gadgets"
slug: /2024/12/inspektor-gadget-unittesting-framework
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

Namaste Inspektors! I was selected by [Alban Crequy](https://github.com/alban) and [Mauricio Vásquez Bernal](https://github.com/mauriciovasquezbernal) under the LFX mentorship program to develop a Testing Framework for Image-based Gadgets to test them on different kernel versions(Issue [#3195](https://github.com/inspektor-gadget/inspektor-gadget/issues/3195) and [#1343](https://github.com/inspektor-gadget/inspektor-gadget/issues/1343)).

In this blog, we’ll discuss the need for this framework and how to use it to effectively test your Gadgets. But first, let’s get familiar with Inspektor Gadget and Image-Based Gadgets.

<!-- truncate -->
# What is Inspektor Gadget?
Inspektor Gadget is an eBPF-based tool and system inspection framework for Kubernetes, containers, and Linux hosts. It translates low-level Linux resources into higher-level concepts like Kubernetes pods and containers. You can use it as a standalone tool or integrate it into your existing workflows. Inspektor Gadget offers a range of Gadgets and also gives you the flexibility to create custom ones. Inspektor Gadget provides several commands to interact with Image-Based Gadgets, you can check them out [here](https://www.inspektor-gadget.io/docs/latest/core-concepts/images/)

## Why unit tests are needed??
Integration tests are effective for ensuring that everything is functioning properly, but they often struggle to verify specific details. Unit tests, on the other hand, are ideal for checking the following:

- The gadget provides the correct information for all fields.
- The filtering mechanism works correctly (e.g., by mount namespace, UID, ports, etc.).
- The gadget flags properly alter the gadget's behavior.
- The unit tests enable us to capture the Gadgets' output in its rawest form, making it simpler to verify their functionality.
- They also help us test the Gadgets on different kernel versions.

## What is the testing framework, and why is it needed?
The testing framework consists of four main components:
- Runners: These enable us to execute event-generating functions in isolated namespaces, simulating conditions similar to containerized environments.
- Matching Mechanism: This compares the captured output with the expected output to ensure Gadgets perform as intended.
- Custom Data Operator: A specialized operator for running Gadgets in their simplest form. It executes Gadgets for a fixed time period and captures data in various scenarios.

- [Vimto Virtual Machine](https://github.com/lmb/vimto): Tests built using this framework are executed on Vimto VMs to run units on different kernel versions, making Vimto an essential part of the framework.

This framework is essential to abstract the lengthy process of generating events, running Gadgets, and matching outputs, simplifying test implementation for developers.


## Writing Tests for Your Gadget

Let's explore the process of creating tests for your Gadgets. We’ll use an example test file, trace_open_test.go, to demonstrate. The associated eBPF program for this test is available [here](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.29.0/gadgets/trace_open/program.bpf.c).
To get started, import the required packages and define an event struct. This struct should contain only the fields you want to validate. Use JSON tags based on the [gadget.yaml](https://github.com/inspektor-gadget/inspektor-gadget/blob/v0.28.1/gadgets/trace_open/gadget.yaml) file for mapping. The defined Event struct is used to unmarshal data from the gadget into the structure and match it with the expected entries.

```go
import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/cilium/ebpf"
	"github.com/stretchr/testify/require"
	"golang.org/x/sys/unix"

	utilstest "github.com/inspektor-gadget/inspektor-gadget/internal/test"
	"github.com/inspektor-gadget/inspektor-gadget/pkg/operators"
	ebpftypes "github.com/inspektor-gadget/inspektor-gadget/pkg/operators/ebpf/types"
	"github.com/inspektor-gadget/inspektor-gadget/pkg/testing/gadgetrunner"
)

type ExpectedTraceOpenEvent struct {
	Proc ebpftypes.Process `json:"proc"`

	Fd       uint32 `json:"fd"`
	FName    string `json:"fname"`
	FlagsRaw int    `json:"flags_raw"`
	ModeRaw  int    `json:"mode_raw"`
	ErrRaw   int    `json:"error_raw"`
}
```
**Initialize this Test:**

We start the test by calling `InitUnitTest(t)`. This ensures that root is required to run the test and removes the memlock limit needed to run gadgets on some older kernel versions.


We will take example of different testing scenarios from [`trace_open`](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/gadgets/trace_open/test/unit/trace_open_test.go)

### Test Scenarios
#### Capturing All Events Without Filters

Objective: Ensure that all file open events are captured when no namespace filters are applied.

Validation: The test expects at least one event and checks the file name (/dev/null) to confirm accuracy.
#### No Events with Non-Matching Filters

Objective: Verify the gadget does not capture events when the filter is configured for a different namespace.

Validation: No events should be detected.
#### Events Matching Specific Namespace Filters

Objective: Test that events are captured only for processes operating in a matching mount namespace.

Validation: The captured event should include details such as file name, flags, and process metadata.
#### Testing File Flags and Modes

Objective: Confirm that the gadget accurately captures the flags and modes used when opening a file.

Setup: A file is created with specific access flags and modes.

Validation: The flags and modes in the captured event are compared to the expected values.

### Example Test: Capturing Events with Filters
Let’s look at a simplified example of one test case:
```go
"captures_events_with_matching_filter": {
    runnerConfig: &utilstest.RunnerConfig{},
    mntnsFilterMap: func(info *utilstest.RunnerInfo) *ebpf.Map {
        return utilstest.CreateMntNsFilterMap(t, info.MountNsID)
    },
    generateEvent: func() (int, error) {
        return unix.Open("/dev/null", 0, 0)
    },
    validateEvent: func(t *testing.T, info *utilstest.RunnerInfo, fd int, events []ExpectedTraceOpenEvent) {
        utilstest.ExpectOneEvent(func(info *utilstest.RunnerInfo, fd int) *ExpectedTraceOpenEvent {
            return &ExpectedTraceOpenEvent{
                Proc:  info.Proc,
                Fd:    uint32(fd),
                FName: "/dev/null",
            }
        })(t, info, fd, events)
    },
},
```
#### How It Works
- The test configures a namespace filter map for the runner.
- A dummy event is generated by opening /dev/null.
- The test validates that the event is captured and matches the expected file name.

### Test Setup
The structure follows the principles of table-driven testing, allowing us to iterate through multiple test cases with different configurations and expected outcomes. Each test runs independently, enabling parallel execution.

```go
for name, testCase := range testCases {
    t.Run(name, func(t *testing.T) {
        t.Parallel()
        // ...
    })
}
```

### Initializing the Runner
A runner is a critical component here, acting as the test environment where the functions generating events will operate. If namespace filtering is required, a mntnsFilterMap (mount namespace filter) is also initialized.
```go
runner := utilstest.NewRunnerWithTest(t, testCase.runnerConfig)
var mntnsFilterMap *ebpf.Map
if testCase.mntnsFilterMap != nil {
    mntnsFilterMap = testCase.mntnsFilterMap(runner.Info)
}
```

## Defining Event Generating Function's Execution

The unit-testing framework provides 2 options for running the function 
- `beforeGadgetRun`: This function is executed before the gadget starts running. It can be use to execute something before the gadget is started. This is also useful to test Snapshotter Gadgets.
- `onGadgetRun`: This function is executed after the gadget is run. It's usually used to generate events that should be captured by the gadget.

### Configuring Gadget Options
Before running the gadget, we define its configuration using GadgetRunnerOpts. This includes the gadget’s image, timeout, and optional namespace filters.

```go
opts := gadgetrunner.GadgetRunnerOpts[ExpectedTraceOpenEvent]{
    Image:          "trace_open",
    Timeout:        5 * time.Second,
    MntnsFilterMap: mntnsFilterMap,
    OnGadgetRun:    onGadgetRun,
}
gadgetRunner := gadgetrunner.NewGadgetRunner(t, opts)
```
#### Key Points:
- Image: Specifies the gadget to be tested (e.g., "trace_open").
- Timeout: Limits execution time to avoid infinite loops or hangs.
- NormalizeEvents: The normalize function sets random fields to zero. Users handle gadget-specific fields. Various functions provided by Inspektor Gadget can be used for different tasks.
- Namespace Filtering: Filters execution based on test-specific namespace configurations.
- Paramvalues: this can be used to define gadget specific values such as `map-fetch-interval`, example can be found with in `top_file` unit test.

### Running Gadget with given Gadget Options.
After defining all the gadget options that are available a new gadgetRunner instance can be created and used to run gadget.
```go
gadgetRunner := gadgetrunner.NewGadgetRunner(t, opts)
gadgetRunner.RunGadget()
```

### Validating captured output against the expected output 

For every particular testCase a specific validation function can be defined in similar fashion:

```go
validateEvent: func(t *testing.T, info *utilstest.RunnerInfo, fd int, events []ExpectedTraceOpenEvent) {
        utilstest.ExpectOneEvent(func(info *utilstest.RunnerInfo, fd int) *ExpectedTraceOpenEvent {
            return &ExpectedTraceOpenEvent{
                Proc:  info.Proc,
                Fd:    uint32(fd),
                FName: "/dev/null",
            }
        })(t, info, fd, events)
}
```

In the given example, the test expects only one event to be captured. Similarly, other functions like `ExpectNoEvent` and `ExpectAtLeastOneEvent` can be used. For checking the equality of two fields, `require.Equal` can be utilized along with other supported functions from the require package.


### Running the Test
#### Selecting the Testing Environment:

You can configure the gadget repository and tag, as well as the image verification method, by setting the following environment variables:

- **GADGET_REPOSITORY:**
Specifies the repository containing the Gadget image. Default is ghcr.io/inspektor-gadget/gadget

- **GADGET_TAG:**
Specifies the tag for the Gadget image. 


- **IG_VERIFY_IMAGE:**
Determines weather to do the image verification or not. Incase of testing gadget on different kernel version this should be kept false since we use [vimto](https://github.com/lmb/vimto) as vimto doesn’t support networking capabilities.

On normal testing machine we can use the following commands:
```go
# [Optional] If running the test for a gadget whose image resides in a remote container registry
export GADGET_REPOSITORY=ghcr.io/my-org GADGET_TAG=latest

# Run the test
go test -exec 'sudo -E' -v
```

### Testing on Different Kernel Versions
For running unit tests for different gadgets on various kernel versions, you need to use vimto.

First, set up QEMU by installing the required packages (qemu-system-x86) and updating the necessary permissions for /dev/kvm.

Next, install vimto using the go install command with the latest version available from its repository.

```bash
# Install QEMU
sudo apt-get update
sudo apt-get install -y qemu-system-x86
sudo chmod 666 /dev/kvm

# Install vimto
CGO_ENABLED=0 GOBIN=$(go env GOPATH)/bin go install lmb.io/vimto@latest

# Running the Test
export IG_VERIFY_IMAGE=false
export VIMTO_VM_MEMORY=4906M
export KERNEL_REPOSITORY=ghcr.io/mauriciovasquezbernal/ci-kernels
export KERNEL_VERSION=5.10

sudo -E vimto -kernel $(KERNEL_REPOSITORY):$(KERNEL_VERSION) -memory $(VIMTO_VM_MEMORY) -- go test -v .
```
Note: Since vimto doesn't support networking out side the Virtual Machine made the gadget image needs to pulled separately and present locally, we also need to keep the gadget image verification to false using the appropriate flag.


## Conclusion
In conclusion, while integration tests ensure broad functionality, unit tests are essential for verifying specific details like accurate field data, correct filtering, and proper flag behavior. A dedicated unit testing framework is also a great way to check gadget compatibility across different kernel versions. It allows for precise validation, ensuring Gadgets perform reliably and as expected, even in diverse environments. For more details, check out the [Inspektor Gadget’s repository](https://github.com/inspektor-gadget/inspektor-gadget). If you encounter any issues while creating your test files don’t hesitate to reach out on [Slack](https://kubernetes.slack.com/messages/inspektor-gadget/). We’re always happy to help!

Happy Inspekting!