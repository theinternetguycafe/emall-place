import { Message, Priority } from '../types';
import { DeliveryQueue } from './DeliveryQueue';

/**
 * An In-Memory implementation of the DeliveryQueue.
 * Handles Priority sorting automatically on insertion.
 * In a production environment, this would be swapped for BullMQ.
 */
export class InMemoryQueue implements DeliveryQueue {
  private queue: Message[] = [];
  private handler: ((message: Message) => Promise<void>) | null = null;
  private isProcessing = false;

  async enqueue(message: Message): Promise<void> {
    this.queue.push(message);
    
    // Sort by priority. HIGH (3) > NORMAL (2) > LOW (1)
    const priorityWeight = {
      [Priority.HIGH]: 3,
      [Priority.NORMAL]: 2,
      [Priority.LOW]: 1
    };

    this.queue.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
    
    console.log(`[InMemoryQueue] Enqueued message ${message.id} with Priority ${message.priority}`);
    
    // Trigger processing if not already running
    this.startProcessing();
  }

  process(handler: (message: Message) => Promise<void>): void {
    this.handler = handler;
    this.startProcessing();
  }

  private async startProcessing() {
    if (this.isProcessing || !this.handler || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (message) {
        try {
          await this.handler(message);
        } catch (error) {
          console.error(`[InMemoryQueue] Error processing message ${message.id}:`, error);
          // Retry logic and DLQ would hook in here.
          // For now, we throw it to a simplistic DLQ logger.
          this.sendToDeadLetterQueue(message, error);
        }
      }
    }

    this.isProcessing = false;
  }

  private sendToDeadLetterQueue(message: Message, error: any) {
    console.error(`[DeadLetterQueue] Failed to deliver Message ${message.id}. Reason:`, error);
  }
}
