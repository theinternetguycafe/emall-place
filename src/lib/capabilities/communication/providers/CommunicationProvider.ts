import { Message } from '../types';

/**
 * Communication Provider Port.
 * Providers are entirely stateless. They simply receive a fully rendered
 * canonical Message object and transmit it over their specific channel network.
 */
export interface CommunicationProvider {
  /**
   * The channel this provider handles (e.g. EMAIL, SMS, PUSH)
   */
  getChannelType(): string;
  
  /**
   * Attempts to send the message. 
   * Throws an error if transmission fails, which the Worker will catch and trigger retries.
   */
  send(message: Message): Promise<void>;
}
