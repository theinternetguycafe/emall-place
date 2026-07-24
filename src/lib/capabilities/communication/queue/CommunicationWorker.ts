import { DeliveryQueue } from './DeliveryQueue';
import { CommunicationProvider } from '../providers/CommunicationProvider';
import { Message } from '../types';

/**
 * The Communication Worker.
 * It polls/processes the DeliveryQueue and delegates the actual sending to the registered Provider Adapters.
 */
export class CommunicationWorker {
  private queue: DeliveryQueue;
  private providers: Map<string, CommunicationProvider> = new Map();

  constructor(queue: DeliveryQueue) {
    this.queue = queue;
  }

  registerProvider(provider: CommunicationProvider) {
    this.providers.set(provider.getChannelType(), provider);
  }

  /**
   * Starts the worker to begin draining the queue.
   */
  start() {
    console.log(`[CommunicationWorker] Started processing queue.`);
    
    this.queue.process(async (message: Message) => {
      const provider = this.providers.get(message.channel);
      
      if (!provider) {
        throw new Error(`No provider registered for channel ${message.channel}`);
      }

      console.log(`[CommunicationWorker] Delegating Message ${message.id} to ${message.channel} Provider`);
      
      // Execute the provider's send method
      await provider.send(message);
    });
  }
}
