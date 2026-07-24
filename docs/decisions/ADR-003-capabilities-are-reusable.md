# ADR-003: Capabilities are Reusable Blocks

**Date:** 2026-07-24  
**Status:** Accepted

## Context
As features were built, functions like `createOrder()` or `processPayment()` were tightly bound to the `Product` entity. This made it difficult to process payments for Services without writing a completely separate payment pipeline. 

## Decision
We define standard, stateless modules called **Capabilities** (e.g., Payments, Messaging, Notifications, Reviews). Capabilities must be entirely domain-agnostic. They do not know *who* or *what* is using them.
Domains consume Capabilities to execute their business logic. For example, both the Product Domain and the Service Domain consume the Payments capability, passing it a generic amount and currency rather than a Domain-specific object.

## Consequences
- **Positive:** Adding a new domain (e.g. Rentals) instantly grants it access to world-class payments, messaging, and reviews with zero extra architectural work.
- **Positive:** Refactoring the Payments provider (e.g. from Paystack to Stripe) requires changing only the Capability, rather than updating every domain that accepts money.
- **Negative:** Requires slightly more mapping logic within the Domain to translate its specific data into the generic shape required by the Capability.
