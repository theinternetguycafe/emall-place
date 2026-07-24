# Security Boundaries

Version 1.0

## Definition
Security is enforced at the Foundation layer of the Commerce OS, specifically within Postgres using Row Level Security (RLS) policies. The application layer (React/Node) is considered insecure and untrusted.

## 1. Domain Identity Validation
A user's `seller_profile.seller_type` is the absolute source of truth for domain access.
- `seller_type: 'product'` -> May only insert/update/delete in the `products` table.
- `seller_type: 'service'` -> May only insert/update/delete in the `services` table.
- `seller_type: 'both'` -> May access both.

Any attempt to bypass this at the API or UI level will be rejected by the Database Engine.

## 2. Hard Data Types
To prevent Domain Leakage, the database schema physically enforces boundaries.
- The `products` table physically requires a valid `stock` integer.
- The `services` table physically rejects the concept of `stock`.
- The `categories` table strictly defines `domain_type`, ensuring a Product cannot be placed in a "Plumbing" Service category.

## 3. Client-Side Guards (Validation Contracts)
While the database is the final bouncer, the frontend utilizes strict Validation Contracts (e.g. `domainValidators.ts`) to provide immediate UX feedback.
Before any payload leaves the client, the Validator checks:
1. Does this payload belong to this Domain?
2. Are there any illegal fields attached to this payload?
If the contract is violated, the payload is dropped before the network request is even made.

## 4. Capability Isolation
Capabilities authenticate the actor, not the domain.
When the Payments capability is invoked, it only verifies that the actor has the required RBAC permissions to initiate a transaction, regardless of whether they are buying a Product or a Service.
