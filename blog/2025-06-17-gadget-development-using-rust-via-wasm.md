---
authors: ["daksh-kaushik"]
title: "Gadget Development using Rust via WASM"
description: "Gadget Development using Rust via WASM"
draft: false
tags: ["ig", "Gadget Development", "rust", "WASM", "LFX Mentorship"]
slug: /2025/05/gadget-development-using-rust-via-wasm
image: /media/2024-05-31-cncf-mentoring-logo.jpg
---

Hello! I am [Daksh Kaushik](https://github.com/Daksh-10), a new Inspektor in the community. Over these past few months, I have been working under the mentorship of [Mauricio Vasquez Bernal](https://github.com/mauriciovasquezbernal) and [Francis Laniel](https://github.com/eiffel-fl) as part of the [LFX Mentorship](https://mentorship.lfx.linuxfoundation.org/project/7fdda09c-0eb8-466b-9fdf-e4b3c6a1d5b3) program. Consider this blog a report on my work during the mentorship. It focuses specifically on supporting gadget development in Rust using WASM.

<!-- truncate -->

## Introduction

The primary goal of my mentorship was to add support for building and running Rust-based gadgets via WebAssembly (WASM). The task was divided into sub-tasks:

1. Creating WASM bindings for the Rust language to access the Inspektor Gadget API.
2. Extending the gadget-builder image to compile Rust code to WASM.
3. Updating the build.yaml logic to support Rust source inputs.
4. Porting and verifying tests for the Rust gadget flow.

Inspektor Gadget exposes a WASM [API](https://www.inspektor-gadget.io/docs/latest/gadget-devel/gadget-wasm-api-raw) that allows Gadgets to interact with it. A Golang [wrapper](https://pkg.go.dev/github.com/inspektor-gadget/inspektor-gadget/wasmapi/go) already exists and this mentorship implemented one for Rust.

## WASM

WASM or WebAssembly Modules are binaries with `.wasm` extensions. These are executed using a runtime (`ig` uses [Wazero](https://github.com/tetratelabs/wazero)) which sets up a sandbox environment for these modules to be run independently and safely. WASM imports functions from the host (`ig`) which are exposed and can be learnt from [API](https://www.inspektor-gadget.io/docs/latest/gadget-devel/gadget-wasm-api-raw) documentation to perform tasks like accessing eBPF maps, enriching the information provided by the eBPF programs, etc.

## Host Imported Functions

During this mentorship, I ported all the existing host-imported functions from Go to Rust. These include:
- Logging
- Datasources
- Fields
- Config
- Parameters
- eBPF Maps
- Handles
- Syscalls
- Perf buffers
- Kallsyms
- Filtering

Let's now take a look at some of them:

### 1. Logging

Send logs from your WASM gadget to the host. They are macros which can log formatted and simple strings.

```rust
use api::{info, warn, error, infof};

#[no_mangle]
#[allow(non_snake_case)]
fn gadgetInit() -> u32 {
    info!("Initialized");
    warn!("Fallback in use");
    error!("Unexpected error occured");
    let a: u32 = 20;
    infof!("value: {}", a);
    0
}
```

### 2. eBPF Map

Use eBPF maps to exchange data between kernel-land and user-land:

```rust
use api::Map;

// ...

let map = Map::get("pid_counter").unwrap();
let count: u64 = map.lookup(&pid, &value).unwrap_or(0);
```

### 3. Perf Buffer

Receive structured events from kernel.
To read from a perfbuffer, it should be paused and if not it provides an error:

```rust
use api::{Map, PerfReader, info};

#[no_mangle]
#[allow(non_snake_case)]
fn gadgetStart() -> i32 {
    // map with name events should exist.
    let map_name = "events";
    let sample = [0u8; 4096];
    let Ok(perf_array) = Map::get(map_name) else {
        errorf!("{} map exists", map_name);
        return 1;
    };

    let Ok(perf_reader) = PerfReader::new(perf_array, 4096, true) else {
        errorf!("creating perf reader");
        return 1;
    };

    if let Ok(_) = perf_reader.read(&sample) {
        errorf!("perf over writable reader must be paused before reading");
        return 1;
    }

    for _ in 0..10 {
        // Let's generate some events by calling indirectly the write() syscall.
        info!("testing perf array");
    }

    if let Err(_) = perf_reader.pause() {
        errorf!("pausing perf reader");
        return 1;
    }

    if let Err(_) = perf_reader.read(&sample) {
        errorf!("reading perf record");
        return 1;
    }

    if let Err(_) = perf_reader.resume() {
        errorf!("resuming perf reader");
        return 1;
    }
    0
}
```
The code executes without an error.

## Workflow

The workflow will explain how sandbox environments are instantiated and how programs are executed in them.

1. **Runtime** → Wazero exposes a runtime which already exists in Inspektor Gadget. It allows compiling the `program.wasm` binary to a [compiled module](https://pkg.go.dev/github.com/tetratelabs/wazero#CompiledModule) which then is instantiated as a sandboxed module.

2. **Compiled Host Module** → It provides functions to the sandbox environment which help the user code to perform tasks.

3. **Compiled Module** → Compiled Module is a WebAssembly module ready to be instantiated (Runtime.InstantiateModule) as an api.Module.

4. **Sandbox Environment** → It contains 4 objects: Memory, Globals, Tables and Functions. All imported from the host and can be accessed during execution.

5. **Exported Function** → The Wasm program implemented by the gadget also needs to export some functions to be invoked by the host. These functions are hooks which belong to the gadget [API](https://inspektor-gadget.io/docs/latest/gadget-devel/gadget-wasm-api-raw/#wasm-module-exported-functions)

![Wasm Architecture](/media/2025-06-17-wasm-architecture.svg)

Now, considering WebAssembly as a black box, we just need to pass .wasm file to the runtime.

## Compiling Rust to WASM for Gadget Development

We need to compile WASM by passing a source code file path to `build.yaml` file and then using `ig image build` command to build the gadget.

The [gadget-builder image](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/Dockerfiles/gadget-builder.Dockerfile) and [Makefile.build](https://github.com/inspektor-gadget/inspektor-gadget/blob/main/cmd/common/image/helpers/Makefile.build) allow compiling `cargo`-initialized directories to `.wasm` files by providing a `build.yaml` file like below:

```yaml
wasm: <path_to_rust_file>
```

## Developing a Rust-Based Gadget

A gadget can be developed by adding Rust API as a dependency in the cargo package. The following steps explain coding a gadget.

### 1. Initialize Cargo Project

```bash
cargo init --lib --vcs=none
```

### 2. Add Rust WASM Bindings

If source code is not on the host system, then in `Cargo.toml` add:

```toml
[dependencies]
api = { git = "https://github.com/inspektor-gadget/inspektor-gadget.git" }
```

Else, local rust API can be used from source code:

```toml
[dependencies]
api={path="<path_to_rust_api>"}
```

### 3. Write Gadget Code in `lib.rs`

```rust
use api::{info, log::LogLevel};

#[no_mangle]
#[allow(non_snake_case)]
fn gadgetInit() -> i32 {
   info!("init: Hello from rust");
   0
}

#[no_mangle]
#[allow(non_snake_case)]
fn gadgetStart() -> i32 {
   info!("start: Hello from rust");
   0
}

#[no_mangle]
#[allow(non_snake_case)]
fn gadgetStop() -> i32 {
   info!("stop: Hello from rust");
   0
}
```

### 4. Compile to WASM
Provide the source code path in the build.yaml file, then run the following command to build the gadget.

```bash
sudo ig image build . -t my-rust-gadget
```
You can specify the path to `lib.rs` in `build.yaml` to have the `gadget-builder` building it for you.

Remember to use `cargo fetch` first to download dependencies if you pass a source file.

To run the image run:
```bash
sudo ig run my-rust-gadget --verify-image=false
INFO[0001] Hello from gadgetInit!
INFO[0002] Hello from gadgetStart!
^CINFO[00015] Hello from gadgetStop!
```

## Testing

Tests are implemented in `pkg/operator/wasm/rusttestdata`. They can be run using:

```bash
make -C "$(pwd)"/Makefile
```

It includes key test cases, and new ones can be added to strengthen coverage.

## Modifications brought to `gadget-builder`

To support Rust WASM, the `gadget-builder` image was updated to include rust toolchain binaries, specifically `cargo` and `rustc`, along with `wasm32-wasip1` target, while we excluded some rust components, such as `clippy`, `rust-docs` and `rustfmt`, to limit the size increase.

## The Experience

I learned that open source is not about free software — it’s about collaboration and robustness. Under the mentorship of amazing maintainers, I submitted code that received detailed review ([300](https://github.com/inspektor-gadget/inspektor-gadget/pull/4275) comments!).

This journey taught me about:
- Maintaining large codebases.
- Navigating PRs and community queries.
- Deep systems topics: **eBPF**, **WebAssembly**, **Containers**, and **Linux Kernel Internals**.

Special thanks to my mentors, the LFX program, CNCF, and Inspektor Gadget.

As I graduate as an LFX mentee (and fellow Inspektor), I carry with me invaluable skills and a community for life.
