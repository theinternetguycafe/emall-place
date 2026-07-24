import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';

/**
 * Archive Engine
 * Persists every event to the `commerce_events` log.
 */
class ArchiveEngine {
  static async process(event: CommerceEvent) {
    // In production: INSERT INTO commerce_events
    console.log(`[ArchiveEngine] Appending ${event.id} (${event.type}) to commerce_events log.`);
  }
}

/**
 * Dimensional Metric definition.
 */
interface Metric {
  name: string;
  value: number;
  labels: Record<string, string>;
}

/**
 * Metrics Engine
 * Extracts dimensional metrics from events for the Observability Dashboard.
 */
class MetricsEngine {
  private static metrics: Metric[] = [];

  static async process(event: CommerceEvent) {
    // Example: Increment total events
    this.recordMetric('events_total', 1, {
      domain: event.domain,
      severity: event.severity,
      producer: event.context.producer,
      type: event.type
    });

    if (event.severity === 'ERROR' || event.severity === 'CRITICAL') {
      this.recordMetric('errors_total', 1, {
        domain: event.domain,
        producer: event.context.producer
      });
    }
  }

  private static recordMetric(name: string, value: number, labels: Record<string, string>) {
    // In production, this pushes to Prometheus / Datadog / CloudWatch
    this.metrics.push({ name, value, labels });
  }
}

/**
 * Trace Engine
 * Reconstructs timelines using correlation_id.
 */
class TraceEngine {
  static async process(event: CommerceEvent) {
    // In production, this might push to Jaeger or DataDog APM
    // Here we just log the tracing tree
    console.log(`[TraceEngine] Tracking ${event.type} in transaction ${event.context.correlation_id}`);
  }
}

/**
 * Health Engine
 * Evaluates system vitals (e.g. error rates, queue depths, timer drift).
 */
class HealthEngine {
  static async process(event: CommerceEvent) {
    if (event.severity === 'CRITICAL') {
      console.warn(`[HealthEngine] 🔴 CRITICAL SYSTEM DEGRADATION DETECTED from ${event.context.producer}`);
      // Trigger PagerDuty / Alerts
    }
  }
}

/**
 * Platform Intelligence (Observability Capability)
 * 
 * The sole consumer of the EventBus global firehose.
 * It is purely observational and NEVER alters domain state.
 */
export class PlatformIntelligence {

  static initialize() {
    // The ONLY permitted use of subscribeAll() in the Commerce OS.
    EventBus.subscribeAll(async (event: CommerceEvent) => {
      
      // Platform Intelligence routes the event to specialized sub-engines asynchronously.
      // This ensures Observability never blocks the EventBus.
      
      Promise.allSettled([
        ArchiveEngine.process(event),
        MetricsEngine.process(event),
        TraceEngine.process(event),
        HealthEngine.process(event)
      ]).catch(err => {
        // Safe catch: Observability failures must never crash the platform
        console.error(`[PlatformIntelligence] Internal processing failure`, err);
      });

    });

    console.log(`[PlatformIntelligence] Initialized. Subscribed to global firehose.`);
  }
}
