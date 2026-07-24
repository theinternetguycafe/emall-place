# Event Lifecycle Contracts

Version 1.0

## Definition
This document tracks the distinct state machine lifecycles of different Domains within the Commerce OS. Understanding how states flow within a domain is critical for avoiding domain leakage.

---

## 1. Product Lifecycle
The Product domain represents physical objects that move through a supply chain.

`Draft` -> `Pending Review` -> `Approved` -> `Published` -> `Purchased` -> `Processing` -> `Shipped` -> `Delivered` -> `Archived / Sold Out`

**Key Transitions:**
- `Published` to `Purchased`: Triggered by the **Cart & Payments** capabilities. Requires `Inventory` decrement.
- `Shipped` to `Delivered`: Triggered by the **Shipping** capability integration.

---

## 2. Service Lifecycle
The Service domain represents professional time and labor agreements.

`Draft` -> `Published` -> `Booking Requested` -> `Quoted` -> `Accepted` -> `Scheduled` -> `Completed` -> `Reviewed`

**Key Transitions:**
- `Published` to `Booking Requested`: Triggered by the **Scheduling & Messaging** capabilities.
- `Booking Requested` to `Quoted`: Asynchronous. The professional scopes the work and issues a dynamic price.
- `Quoted` to `Accepted`: Triggered by the **Payments** capability (deposit paid).
- `Completed` to `Reviewed`: Triggered by the **Reviews** capability.

---

## 3. (Future) Auction Lifecycle
The Auction domain represents competitive real-time bidding for an asset.

`Draft` -> `Published` -> `Live` -> `Bidding` -> `Ended` -> `Payment Processing` -> `Complete`

**Key Transitions:**
- `Live` to `Bidding`: Triggered by the **Real-Time Clock / Socket** capability.
- `Bidding` to `Ended`: Automatic transition upon timer expiration. Highest bid is locked.
- `Ended` to `Payment Processing`: Consumes **Payments** capability to capture the winning bidder's funds.

---

## Why this matters
By mapping lifecycles side-by-side, we clearly see where Domains differ. If you attempt to force a Service through a "Shipped" status, you are violating the Domain Contract. If a Product requires a "Quote" before purchase, it might actually be a Service masquerading as a Product.
