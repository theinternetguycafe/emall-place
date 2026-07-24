import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';
import { PreferencesService } from './preferences';
import { TemplateResolver } from './templates/TemplateResolver';
import { DeliveryQueue } from './queue/DeliveryQueue';
import { InMemoryQueue } from './queue/InMemoryQueue';
import { CommunicationWorker } from './queue/CommunicationWorker';
import { EmailProvider } from './providers/EmailProvider';
import { Channel, Message, MessageCategory, Priority } from './types';
import { v4 as uuidv4 } from 'uuid'; // or crypto.randomUUID()

/**
 * The Communication Capability Bootstrapper.
 * It wires up the Event Bus listeners to the Templates, Preferences, and Queue.
 */
export class CommunicationCapability {
  private queue: DeliveryQueue;
  private worker: CommunicationWorker;

  constructor() {
    // Phase C: Initialize the Queue
    this.queue = new InMemoryQueue();
    
    // Phase C: Initialize the Worker and register Providers (Phase D)
    this.worker = new CommunicationWorker(this.queue);
    this.worker.registerProvider(new EmailProvider());
    
    // Start processing the queue in the background
    this.worker.start();
  }

  /**
   * Initializes the event subscriptions.
   */
  startListening() {
    // Subscribe to BidOutbid
    EventBus.subscribe('BidOutbid', async (event: CommerceEvent) => {
      // 1. Identify recipient from payload (mocked here, usually requires a quick lookup)
      const recipientId = event.payload.previous_bidder_id || 'user-123';
      
      // 2. We route this as a TRANSACTIONAL message with NORMAL priority
      await this.dispatch(event, recipientId, MessageCategory.TRANSACTIONAL, Priority.NORMAL);
    });

    // Subscribe to AuctionEnded (e.g., You won! / It ended)
    EventBus.subscribe('AuctionEnded', async (event: CommerceEvent) => {
      const recipientId = event.payload.seller_id || 'seller-123';
      
      // 3. High priority transactional message
      await this.dispatch(event, recipientId, MessageCategory.TRANSACTIONAL, Priority.HIGH);
    });
  }

  /**
   * The core dispatch pipeline: Preferences -> Template -> Queue
   */
  private async dispatch(
    event: CommerceEvent, 
    recipientId: string, 
    category: MessageCategory, 
    priority: Priority
  ) {
    
    // Phase B: Fetch User Preferences
    const prefs = await PreferencesService.getUserPreferences(recipientId);

    // Evaluate all supported channels (Email, Push, SMS)
    const channels = [Channel.EMAIL, Channel.PUSH, Channel.SMS];

    for (const channel of channels) {
      if (PreferencesService.isAllowed(prefs, channel, category)) {
        
        try {
          // Phase A: Resolve Template
          const rendered = TemplateResolver.resolve(event, channel);
          
          // Construct canonical Message
          const message: Message = {
            id: uuidv4(),
            recipient_id: recipientId,
            channel: channel,
            category: category,
            priority: priority,
            subject: rendered.subject,
            body: rendered.body,
            metadata: {
              causation_id: event.event_id // Tracing back to the business fact
            }
          };

          // Phase C: Enqueue (Non-blocking to the Event Bus thread)
          await this.queue.enqueue(message);
          
        } catch (error) {
          console.warn(`[CommunicationCapability] Failed to dispatch ${event.type} via ${channel}:`, error);
        }
      }
    }
  }
}
