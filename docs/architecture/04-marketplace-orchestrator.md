# Marketplace Orchestrator Contract

Version 1.0

## Definition
The Marketplace Orchestrator (The Conductor) is the top-level view layer of the Commerce OS. It is responsible for discovering, displaying, and mixing domains into a unified user experience.

## 1. Responsibilities
The Marketplace Orchestrator **MAY**:
- **Discover**: Find items across all active domains.
- **Search**: Pass user queries down to the unified search capabilities.
- **Rank**: Determine the order of items based on fair algorithms.
- **Recommend**: Suggest related items based on browsing history.
- **Interleave**: Display Products, Services, Rentals, etc., side-by-side cleanly.
- **Filter**: Apply universal filters (e.g. price, rating) across diverse domains.
- **Personalize**: Tailor the feed to the specific logged-in user.

The Marketplace Orchestrator **MAY NOT**:
- Manage inventory or availability.
- Schedule bookings.
- Calculate shipping rates.
- Calculate travel boundaries.
- Store domain-specific data.
- Validate products or services.

## 2. Feed Contract
The Orchestrator communicates with domains using a normalized `UnifiedFeedItem` structure.
```typescript
type UnifiedFeedItem = {
  type: 'product' | 'service' | 'rental' | 'property';
  data: any; // The domain-specific payload
};
```
The Feed does not care what is inside `data`. It simply delegates rendering to the appropriate Domain Card (e.g. `UnifiedProductCard`, `UnifiedServiceCard`) based on the `type`.

## 3. Search Contract
When a user searches, the Orchestrator does not execute a monolithic query. It uses the `unifiedSearch` engine to:
1. Spin up parallel asynchronous queries for each active Domain.
2. Catch errors independently (if the Product DB is down, Services still load).
3. Aggregate the results into a single pool.

## 4. Ranking and Interleaving Rules
Currently, the Orchestrator uses a simple 1:1 interleaving algorithm to ensure fair visibility between Products and Services.
As the OS grows, this capability will be replaced with an AI-driven or weighted ranking algorithm that prioritizes conversion rates, user preference, and geographic relevance, without altering the underlying domains.
