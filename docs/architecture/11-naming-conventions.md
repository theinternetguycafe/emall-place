# 11. Naming Conventions

**Status:** Living document. Updated alongside `COMMERCE_OS_V1.md`.

To maintain a cohesive platform, naming must be strictly standardized across all layers. Predictable names reduce cognitive load and enforce architectural boundaries.

---

## 1. Events (Business Facts)

**Rule:** Past tense only. An event describes what *already happened*, never what *should* happen. It is a fact, not a command.

* **Pattern:** `[DomainObject][ActionInPastTense]`
* **Examples:**
    * ✅ `BidPlaced`
    * ✅ `BidRejected`
    * ✅ `AuctionEnded`
    * ✅ `PaymentRequested`
    * ✅ `OrderCreated`
* **Forbidden:**
    * ❌ `PlaceBid` (Command)
    * ❌ `CreateOrder` (Command)
    * ❌ `AuctionEnd` (Ambiguous)

---

## 2. Capabilities

**Rule:** Nouns. A capability represents a discrete area of reusable business behaviour, not a background process or a utility.

* **Pattern:** `[DomainConcept]`
* **Examples:**
    * ✅ `Money`
    * ✅ `Settlement`
    * ✅ `Communication`
    * ✅ `Pricing`
    * ✅ `Reviews`
    * ✅ `Timer`
* **Forbidden:**
    * ❌ `PriceManager` (Implementation detail)
    * ❌ `PaymentProcessor` (Implementation detail)
    * ❌ `NotificationSystem` (Too broad)

---

## 3. Domains

**Rule:** Plural business nouns. Domains represent entirely independent problem spaces.

* **Pattern:** `[BusinessEntity]s`
* **Examples:**
    * ✅ `Products`
    * ✅ `Services`
    * ✅ `Vehicles`
    * ✅ `Property`
    * ✅ `Jobs`
    * ✅ `Auctions`

---

## 4. Ports (Interfaces)

**Rule:** Interfaces describing what is needed from the outside world.

* **Pattern:** `[DomainConcept][Role]` or just `[DomainConcept]` if clear.
* **Examples:**
    * ✅ `CommunicationProvider`
    * ✅ `DeliveryQueue`
    * ✅ `EventDispatcher`

---

## 5. Adapters (Implementations)

**Rule:** Concrete implementations of Ports. The name must clearly identify the specific technology or mechanism being used.

* **Pattern:** `[Technology][PortName]`
* **Examples:**
    * ✅ `EmailProvider`
    * ✅ `SendGridProvider`
    * ✅ `SupabaseRealtimeAdapter`
    * ✅ `KafkaDispatcher`
    * ✅ `InMemoryQueue`
