# ADR-002: Strict Domain Separation

**Date:** 2026-07-24  
**Status:** Accepted

## Context
Previously, eMallPlace treated all tradable items similarly. A Service (e.g., plumbing) was modeled as a Product with a `price` and an artificial `stock` of `999`. This created UX problems where customers were prompted to "Add to Cart" or see "In Stock" badges for professional services, and forced developers to write UI hacks to hide these elements conditionally.

## Decision
We enforce Strict Domain Separation across the Commerce OS.
Domains (Products, Services, Rentals, Auctions) must exist in completely isolated bounded contexts. They have their own database tables, their own lifecycle rules, and their own UI forms (e.g., `ProductStudio` vs `ServiceDesk`). A domain may never borrow the business rules or lifecycle states of another domain.

## Consequences
- **Positive:** UI and backend logic becomes vastly simpler. A `ProductForm` no longer needs to conditionally hide the `stock` input, because it is only ever used for physical products.
- **Positive:** Data integrity is guaranteed at the database level via strict RLS and hard schema constraints.
- **Negative:** Shared UI patterns must be duplicated or highly generalized, and cross-domain data aggregation requires parallel queries.
