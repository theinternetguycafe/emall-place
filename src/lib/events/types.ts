/**
 * Event Classifications for richer filtering in Platform Intelligence.
 */
export enum EventCategory {
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  AUDIT = 'AUDIT'
}

export enum EventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Event Execution Context
 * Technical metadata separated from the business payload.
 */
export interface EventContext {
  schema_version: number;
  producer: string;       // Which capability/domain produced this? e.g., "BiddingCapability"
  correlation_id: string; // Ties a chain of events together (e.g., the original Auction ID)
  causation_id: string;   // The specific event ID that directly caused this one
  trace_id?: string;      // Optional OpenTelemetry/distributed trace ID
  
  // Execution Environment
  ip_address?: string;
  user_agent?: string;
  platform?: string;
  region?: string;
  request_id?: string;
  session_id?: string;
  tenant_id?: string;
  locale?: string;
}

/**
 * Event Envelope (v2)
 * The wrapper around every fact published in the Commerce OS.
 */
export interface CommerceEvent<T = any> {
  // Identification
  id: string;            // UUIDv7 recommended for chronological sorting
  type: string;          // e.g., 'BidPlaced'
  occurred_at: string;   // ISO8601 UTC timestamp

  // Classification
  category: EventCategory;
  domain: string;        // e.g., 'auction', 'payment', 'platform'
  severity: EventSeverity;
  tags: string[];        // e.g., ['security', 'customer']

  // Technical Metadata & Tracing
  context: EventContext;

  // Business Fact (The only thing that varies by event type)
  payload: T;
}
