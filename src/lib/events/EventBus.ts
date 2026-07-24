import { CommerceEvent } from './types';

type EventHandler = (event: CommerceEvent) => Promise<void>;

/**
 * Event Bus (v2)
 * The nervous system of Commerce OS.
 * 
 * Implements a strict Fire-and-Forget, 3-tier subscription model.
 */
export class EventBus {
  // Tier 1: Event Scope (e.g., 'BidPlaced')
  private static eventSubscribers: Map<string, EventHandler[]> = new Map();
  
  // Tier 2: Domain Scope (e.g., 'auction')
  private static domainSubscribers: Map<string, EventHandler[]> = new Map();
  
  // Tier 3: Global Scope (Platform Infrastructure Only)
  private static globalSubscribers: EventHandler[] = [];

  /**
   * Publishes an event to the bus.
   * STRICT RULE: This method MUST return immediately. 
   * It never waits for subscribers to process the event.
   */
  static async publish(event: CommerceEvent): Promise<void> {
    console.log(`[EventBus] Dispatched [${event.category}] ${event.domain}:${event.type} (${event.severity})`);
    
    // Dispatch asynchronously — fire and forget
    setTimeout(() => {
      this.dispatchInternal(event);
    }, 0);
  }

  private static async dispatchInternal(event: CommerceEvent) {
    const promises: Promise<void>[] = [];

    // 1. Notify specific event subscribers
    const specificHandlers = this.eventSubscribers.get(event.type) || [];
    for (const handler of specificHandlers) {
      promises.push(this.safeExecute(handler, event));
    }

    // 2. Notify domain-wide subscribers
    const domainHandlers = this.domainSubscribers.get(event.domain) || [];
    for (const handler of domainHandlers) {
      promises.push(this.safeExecute(handler, event));
    }

    // 3. Notify global subscribers (Platform Intelligence / Archiving)
    for (const handler of this.globalSubscribers) {
      promises.push(this.safeExecute(handler, event));
    }

    // Wait for all to finish, but silently catch errors to prevent crashing the bus
    await Promise.all(promises);
  }

  private static async safeExecute(handler: EventHandler, event: CommerceEvent) {
    try {
      await handler(event);
    } catch (error) {
      console.error(`[EventBus] Subscriber failed processing ${event.type}:`, error);
      // In production, this error itself would be published as a SYSTEM/ERROR event
      // for Platform Intelligence to track subscriber health.
    }
  }

  // ==========================================
  // SUBSCRIPTION TIERS
  // ==========================================

  /**
   * Tier 1: Event Scope
   * Used by Business Domains and Capabilities to react to specific facts.
   */
  static subscribe(eventType: string, handler: EventHandler) {
    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, []);
    }
    this.eventSubscribers.get(eventType)!.push(handler);
    console.log(`[EventBus] Registered Event Subscriber: ${eventType}`);
  }

  /**
   * Tier 2: Domain Scope
   * Used for domain-wide projections and dashboards.
   */
  static subscribeDomain(domain: string, handler: EventHandler) {
    if (!this.domainSubscribers.has(domain)) {
      this.domainSubscribers.set(domain, []);
    }
    this.domainSubscribers.get(domain)!.push(handler);
    console.log(`[EventBus] Registered Domain Subscriber: ${domain}`);
  }

  /**
   * Tier 3: Global Scope
   * RESTRICTED: Used exclusively by Platform Infrastructure (e.g., Observability).
   */
  static subscribeAll(handler: EventHandler) {
    this.globalSubscribers.push(handler);
    console.log(`[EventBus] Registered GLOBAL Subscriber (Infrastructure Only)`);
  }
}
