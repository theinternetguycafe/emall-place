# Principle 0: What are you?

Every new feature must first answer one question before any code is written:
**What are you?**
- Are you a **Domain**?
- Are you a **Capability**?
- Are you part of the **Shared Foundation**?
- Or are you part of the **Marketplace Orchestrator**?

If this question cannot be clearly answered, stop and redesign the feature. The architecture stays coherent only when features belong exactly where they fit.

---

# Principle 1: The Marketplace Orchestrates. It never owns business logic.

The Marketplace is a **Conductor**, not a **Container**.
It may Discover, Search, Rank, Recommend, Interleave, Filter, and Personalize.
It **may not** manage inventory, schedule bookings, calculate shipping or travel distances, store stock, or validate any domain-specific data.

# Principle 2: Domains own behavior. They never borrow another domain's behavior.

Domains (like Products, Services, Rentals) represent completely separate bounded contexts.
A domain may inherit shared infrastructure from the OS, but it may **NEVER** inherit another domain's business logic.
- A Service must not borrow a Product's "stock" logic.
- A Product must not borrow a Service's "base_rate" logic.
- A "Hack" to merge these domains is strictly forbidden.

# Principle 3: Capabilities are reusable. Business rules are not.

Capabilities (Payments, Reviews, Messaging, Search, Images) are agnostic building blocks.
Domains consume capabilities to implement their business rules.
- Product Domain consumes `Inventory` and `Cart` to build its e-commerce flow.
- Service Domain consumes `Scheduling` and `Booking` to build its professional flow.
Both domains might consume the `Payments` capability, but neither domain needs to know how the other works.

# Principle 4: Explicit Contracts Over Implicit Hacks

Every mature system eventually reaches a point where it must stop relying on clever shortcuts and start modeling the business properly. Replacing hacks with explicit domain models is how this platform grows. If a feature does not fit a contract cleanly, the contract must be evolved or a new domain created. No shortcuts.
