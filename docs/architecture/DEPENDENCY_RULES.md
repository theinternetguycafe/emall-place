# Dependency Rules

**Status:** Living document. Updated alongside `COMMERCE_OS_V1.md`.

To prevent architectural drift and maintain a clean separation of concerns, the Commerce OS strictly enforces a unidirectional dependency flow.

## The Rule

Dependencies must **always point downwards**. There are no exceptions.

```mermaid
graph TD
    Application[Application (e.g. eMallPlace)]
    Orchestrator[Orchestrator (e.g. Marketplace)]
    Domain[Domain (e.g. Auctions, Products)]
    Capability[Capability (e.g. Settlement, Bidding)]
    Foundation[Foundation (e.g. Event Bus, Timer)]
    Port[Port (e.g. DeliveryQueue)]
    Adapter[Adapter (e.g. InMemoryQueue)]

    Application --> Orchestrator
    Orchestrator --> Domain
    Domain --> Capability
    Capability --> Foundation
    Foundation --> Port
    Port --> Adapter
```

## Violations

*   **No upward arrows:** A Domain cannot import an Orchestrator. A Capability cannot import a Domain.
*   **No sideways arrows at the Domain level:** `Auctions` cannot import `Products`. They must communicate via the Event Bus.
*   **Adapters are leaf nodes:** An Adapter implements a Port but does not contain business logic. Business logic (Domains, Capabilities) must never import an Adapter directly.

If any code violates these rules, the design is flawed and must be re-architected.
