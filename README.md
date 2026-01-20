# 👻 Ghost Trading: Phantom Simulator (Part 1)

**Perform "Astral Projection" on the EVM.**

This repository accompanies the **Part 1** guide on building a local MEV simulation engine. It demonstrates how to simulate complex arbitrage trades locally using `eth_call` and **Phantom Deployments**.

> 📖 **Read the full guide on Substack:** [**Ghost Trading: How to Haunt the EVM for Risk-Free Arbitrage**](https://sohammalve.substack.com/p/ghost-trading-how-to-haunt-the-evm)

## 💀 The Concept

Most arbitrage bots rely on standard math ($x \cdot y = k$) to calculate profits. They assume every token behaves like USDC. But the chain is full of **"Trap Tokens"** (Rebase, Fee-on-transfer, Honeypots) that will wreck your PnL.

**The Solution:**
Instead of deploying a contract to test a trade (expensive), or trusting the Router (risky), we perform a **Phantom Deployment**.
1.  We compile our Arbitrage logic (`PhantomOut.sol`).
2.  We construct a deployment transaction but send it via `eth_call`.
3.  The node executes the constructor, runs the swap logic, and returns the result without ever touching the blockchain state.

**Zero Gas. Zero Risk.**

## ⚡ Tech Stack

* **[Bun](https://bun.sh/):** High-performance TypeScript runtime (faster than Node).
* **[Foundry](https://getfoundry.sh/):** For writing and compiling the high-performance Solidity logic.
* **[Ethers.js](https://docs.ethers.org/v6/):** For interacting with the local/remote Reth node.

## 🛠️ Setup & Installation

### 1. Prerequisites
Ensure you have **Bun** and **Foundry** installed.

```bash
# Install Bun
curl -fsSL [https://bun.sh/install](https://bun.sh/install) | bash

# Install Foundry
curl -L [https://foundry.paradigm.xyz](https://foundry.paradigm.xyz) | bash
foundryup

###  Install Dependencies
```bash
bun install

```shell
forge build
```
