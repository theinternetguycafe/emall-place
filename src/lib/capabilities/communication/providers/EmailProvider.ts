import { CommunicationProvider } from './CommunicationProvider';
import { Channel, Message } from '../types';

export class EmailProvider implements CommunicationProvider {
  getChannelType(): string {
    return Channel.EMAIL;
  }

  async send(message: Message): Promise<void> {
    if (message.channel !== Channel.EMAIL) {
      throw new Error(`EmailProvider cannot handle channel type ${message.channel}`);
    }

    // Stateless delivery logic.
    // In a real environment, this would call AWS SES, SendGrid, Mailgun, etc.
    console.log(`[EmailProvider] Delivering Email:`);
    console.log(`[EmailProvider]   To: ${message.recipient_id}`);
    console.log(`[EmailProvider]   Subject: ${message.subject}`);
    console.log(`[EmailProvider]   Body: ${message.body}`);
    
    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`[EmailProvider] Delivery Successful for Message ${message.id}`);
  }
}
