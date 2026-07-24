import { Message } from '../types';

/**
 * Queue Port (Interface).
 * The Commerce OS relies on this interface, completely agnostic 
 * to whether the implementation is InMemory, BullMQ, Kafka, or SQS.
 */
export interface DeliveryQueue {
  enqueue(message: Message): Promise<void>;
  
  // Expose a way for Workers to process items
  process(handler: (message: Message) => Promise<void>): void;
}
