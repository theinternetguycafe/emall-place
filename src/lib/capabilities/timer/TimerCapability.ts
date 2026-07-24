import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * The Timer Capability.
 * 
 * Domains never check the clock. They schedule an event and forget about it.
 * The Timer Capability fires the event when the time comes.
 * 
 * This same capability powers:
 *   - Auction expiry
 *   - Payment deadlines
 *   - Rental returns
 *   - Subscription renewals
 *   - Flash sale windows
 *   - Quote expiry
 *   - Booking reminders
 */

export interface ScheduledEvent {
  id: string;
  event_type: string;
  target_domain: string;
  target_id: string;
  trigger_at: Date;
  payload: Record<string, any>;
  status: 'pending' | 'fired' | 'cancelled' | 'failed';
  attempts: number;
  last_error?: string;
  fired_at?: Date;
}

export class TimerCapability {
  // In-memory store for development. Production would use the scheduled_events table.
  private static timers: Map<string, { event: ScheduledEvent; timeout: ReturnType<typeof setTimeout> }> = new Map();

  /**
   * Schedules an event to fire at a specific time.
   * The calling domain forgets about time after this call.
   */
  static scheduleAt(
    eventType: string,
    targetDomain: string,
    targetId: string,
    triggerAt: Date,
    payload: Record<string, any> = {},
    correlationId?: string
  ): string {
    const id = uuidv4();

    const scheduledEvent: ScheduledEvent = {
      id,
      event_type: eventType,
      target_domain: targetDomain,
      target_id: targetId,
      trigger_at: triggerAt,
      payload,
      status: 'pending',
      attempts: 0,
    };

    const delayMs = Math.max(0, triggerAt.getTime() - Date.now());

    const timeout = setTimeout(async () => {
      await TimerCapability.fire(id, correlationId);
    }, delayMs);

    this.timers.set(id, { event: scheduledEvent, timeout });

    console.log(`[TimerCapability] Scheduled "${eventType}" for ${targetDomain}/${targetId} at ${triggerAt.toISOString()} (in ${Math.round(delayMs / 1000)}s)`);

    return id;
  }

  /**
   * Cancels a scheduled event before it fires.
   */
  static cancel(timerId: string): boolean {
    const entry = this.timers.get(timerId);
    if (entry && entry.event.status === 'pending') {
      clearTimeout(entry.timeout);
      entry.event.status = 'cancelled';
      console.log(`[TimerCapability] Cancelled timer ${timerId}`);
      return true;
    }
    return false;
  }

  /**
   * Fires the scheduled event, publishing it to the Event Bus.
   */
  private static async fire(timerId: string, correlationId?: string): Promise<void> {
    const entry = this.timers.get(timerId);
    if (!entry || entry.event.status !== 'pending') return;

    const { event } = entry;
    event.attempts += 1;

    try {
      const commerceEvent: CommerceEvent = {
        event_id: uuidv4(),
        type: event.event_type,
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        producer: 'TimerCapability',
        correlation_id: correlationId || event.target_id,
        causation_id: event.id, // The scheduled event itself is the cause
        payload: {
          target_domain: event.target_domain,
          target_id: event.target_id,
          ...event.payload,
        },
      };

      await EventBus.publish(commerceEvent);

      event.status = 'fired';
      event.fired_at = new Date();

      console.log(`[TimerCapability] Fired "${event.event_type}" for ${event.target_domain}/${event.target_id}`);
    } catch (error: any) {
      event.status = 'failed';
      event.last_error = error.message;
      console.error(`[TimerCapability] Failed to fire "${event.event_type}":`, error);
    }
  }
}
