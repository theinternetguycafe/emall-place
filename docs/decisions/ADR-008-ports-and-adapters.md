# ADR-008: Ports and Adapters

**Date:** 2026-07-25  
**Status:** Accepted

## Context
As the Commerce OS grows to include more capabilities (Communication, Timer, Settlement, Payments), we need a clear rule governing how domain logic interacts with infrastructure. Without this boundary, domain code risks becoming tightly coupled to specific databases, message queues, email providers, and payment gateways — making the platform impossible to test, migrate, or scale independently.

## Decision
The Commerce OS adopts a **Ports and Adapters** architecture (also known as Hexagonal Architecture).

The sacred rule:

> **Infrastructure may depend on domains through ports, but domains may never depend on infrastructure.**

Concretely:
- **Domains** define the business rules and logic. They know nothing about databases, HTTP, WebSockets, email providers, or queues.
- **Capabilities** expose **Ports** — abstract interfaces that describe *what* they need from the outside world (e.g., `DeliveryQueue`, `CommunicationProvider`, `EventDispatcher`).
- **Adapters** implement those Ports using specific infrastructure (e.g., `InMemoryQueue`, `EmailProvider`, `SupabaseRealtimeDispatcher`).

## Examples in the Commerce OS

| Port (Interface) | Adapter (Implementation) |
|---|---|
| `EventDispatcher` | `InMemoryDispatcher`, future `KafkaDispatcher` |
| `DeliveryQueue` | `InMemoryQueue`, future `BullMQQueue` |
| `CommunicationProvider` | `EmailProvider`, future `SMSProvider`, `WhatsAppProvider` |

## Consequences
- **Positive:** Any adapter can be swapped without modifying domain or capability code. Moving from an in-memory queue to BullMQ is a one-line configuration change.
- **Positive:** Domains are fully testable in isolation using mock adapters.
- **Positive:** The platform becomes infrastructure-agnostic, supporting deployment on any cloud or self-hosted environment.
- **Negative:** Requires discipline. Developers must always ask: "Am I importing infrastructure into my domain?" If yes, they must introduce a Port first.
