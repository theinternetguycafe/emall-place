import { Channel } from '../types';
import { CommerceEvent } from '../../events/types';

export interface RenderedTemplate {
  subject?: string;
  body: string;
}

/**
 * The TemplateResolver maps a CommerceEvent (Business Fact) to a specific Channel rendering.
 */
export class TemplateResolver {
  
  static resolve(event: CommerceEvent, channel: Channel): RenderedTemplate {
    
    // In production, this would load localized Handlebars/React-Email templates from a DB or CDN.
    switch (event.type) {
      case 'BidOutbid':
        return this.renderBidOutbid(event.payload, channel);
      case 'AuctionEnded':
        return this.renderAuctionEnded(event.payload, channel);
      default:
        throw new Error(`No templates found for event type: ${event.type}`);
    }
  }

  private static renderBidOutbid(payload: any, channel: Channel): RenderedTemplate {
    if (channel === Channel.EMAIL) {
      return {
        subject: `You've been outbid on an item!`,
        body: `Hello, you were outbid on auction ${payload.auction_id}. The current highest bid is now ${payload.currency} ${payload.amount}. Click here to increase your bid!`
      };
    }
    
    if (channel === Channel.PUSH) {
      return {
        body: `You were outbid! Current bid: ${payload.currency} ${payload.amount}`
      };
    }
    
    throw new Error(`Template not implemented for ${channel}`);
  }

  private static renderAuctionEnded(payload: any, channel: Channel): RenderedTemplate {
    if (channel === Channel.EMAIL) {
      return {
        subject: `Auction ${payload.auction_id} has ended!`,
        body: `The auction has concluded. Please check your dashboard to see if you won.`
      };
    }
    
    throw new Error(`Template not implemented for ${channel}`);
  }
}
