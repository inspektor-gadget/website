---
authors: [francis-laniel]
description: "Inspektor Gadget is available in AzureLinux 3"
draft: false
tags: ["eBPF", "ig", "inspektor gadget", "Mariner", "AzureLinux"]
title: "Inspektor Gadget is available in AzureLinux 3"
slug: /2024/08/inspektor-gadget-is-available-in-azure-linux-3
image: /media/ig-in-mariner-3.jpg
date: 2024-08-06T10:00
---

Last week, the team behind Azure Linux officially released its [version 3](https://github.com/microsoft/azurelinux/releases/tag/3.0.20240727-3.0).
Starting with this version, Inspektor Gadget is available in the official repository and can be installed by simply calling `tdnf`.
Let's now deploy an Azure Linux 3 VM to install and use Inspektor Gadget, specifically the `trace exec` gadget to monitor the corresponding syscalls:

<!-- truncate -->
```bash
you@home$ resource_group='azure-linux-3'
you@home$ vm='azure-linux-3-vm'
you@home$ admin='testadmin'
you@home$ image='MicrosoftCBLMariner:azure-linux-3:azure-linux-3:3.20240727.01'
you@home$ az group create --name $resource_group --location westeurope
...
you@home$ az vm create --resource-group $resource_group --name $vm --image $image --admin-username ${admin} --generate-ssh-keys --security-type Standard
...
you@home$ ip=$(az vm show --resource-group $resource_group --name $vm -d --query '[privateIps]' --output tsv)
you@home$ ssh $admin@$ip
testadmin@azure-linux-3-vm [ ~ ]$ cat /etc/os-release
NAME="Microsoft Azure Linux"
VERSION="3.0.20240727"
ID=azurelinux
VERSION_ID="3.0"
PRETTY_NAME="Microsoft Azure Linux 3.0"
ANSI_COLOR="1;34"
HOME_URL="https://aka.ms/azurelinux"
BUG_REPORT_URL="https://aka.ms/azurelinux"
SUPPORT_URL="https://aka.ms/azurelinux"
testadmin@azure-linux-3-vm [ ~ ]$ sudo tdnf install -y ig
Installing:
ig                          x86_64               0.30.0-1.azl3               azurelinux-official-base  69.42M              18.23M

Total installed size:  69.42M
Total download size:  18.23M
ig                                    19119377 100%
warning: /var/cache/tdnf/azurelinux-official-base/rpms/Packages/i/ig-0.30.0-1.azl3.x86_64.rpm: Header V4 RSA/SHA256 Signature, key ID 3135ce90: NOKEY
importing key from file:///etc/pki/rpm-gpg/MICROSOFT-RPM-GPG-KEY
Testing transaction
Running transaction
Installing/Updating: ig-0.30.0-1.azl3.x86_64
testadmin@azure-linux-3-vm [ ~ ]$ ig version
v30.0.0
testadmin@azure-linux-3-vm [ ~ ]$ while true; do date > /dev/null; sleep 1; done &
[1] 2035
testadmin@azure-linux-3-vm [ ~ ]$ sudo ig trace exec --host
RUNTIME.CONTAINERNAME            PID        PPID       COMM              PCOMM             RET ARGS
                                 2127       2035       date              bash              0   /usr/bin/date
                                 2128       2035       sleep             bash              0   /usr/bin/sleep 1
                                 2129       2035       date              bash              0   /usr/bin/date
                                 2130       2035       sleep             bash              0   /usr/bin/sleep 1
^C
testadmin@azure-linux-3-vm [ ~ ]$ kill 2035
```

As you can see, `ig` was able to report the `exec()` syscalls done to run `date` and `sleep`!
This way, you can use the tool to diagnose and troubleshoot AzureLinux host processes as well as processes running in containers!

This work would not have been possible without the help from the AzureLinux team, particularly [Christopher Co](https://github.com/christopherco) and [Muhammad Falak R. Wani](https://github.com/mfrw)!
We thank them for making it possible!
