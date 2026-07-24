# ADR-001: Marketplace is an Orchestrator

**Date:** 2026-07-24  
**Status:** Accepted

## Context
As the platform grew, the Marketplace component (`SellerProductsTable`, `ProductCard`, etc.) began accumulating logic for both physical Products and professional Services. This led to complex UI checks (e.g., `isService ? hideStock : showStock`) and data leakage, where services were stored as products with `stock: 999` just to appear on the marketplace.

## Decision
We define the Marketplace exclusively as an **Orchestrator**. 
It is a Conductor, not a Container. It must not own any business logic, manage inventory, or validate domain structures. Its sole responsibility is to discover items, search across domains in parallel, and interleave results into a Unified Feed for the user.

## Consequences
- **Positive:** Adding a new domain (e.g. Rentals) to the platform does not require modifying existing Marketplace components; the Orchestrator simply discovers the new domain and renders its corresponding card.
- **Negative:** Search becomes slightly more complex, as it requires parallel queries to multiple domain tables rather than a single `SELECT * FROM items` query.
