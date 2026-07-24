import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';

/**
 * The Notification Capability.
 * Subscribes to the Event Bus and routes domain events to actual notification transports 
 * (Email, Push, SMS) based on user preferences.
 * 
 * Notice that no domain ever calls `Notifications.send()`.
 * They simply broadcast facts to the Event Bus.
 */
export function initializeNotificationCapability() {
  
  // 1. Subscribe to BidOutbid
  EventBus.subscribe('BidOutbid', async (event: CommerceEvent) => {
    const payload = event.payload;
    console.log(`[NotificationCapability] Processing BidOutbid for Auction: ${payload.auction_id}`);
    
    // Logic:
    // a. Fetch the previous bidder's preferences
    // b. Format the email/push notification
    // c. Dispatch to Email/Push adapters
  });

  // 2. Subscribe to AuctionEnded
  EventBus.subscribe('AuctionEnded', async (event: CommerceEvent) => {
    const payload = event.payload;
    console.log(`[NotificationCapability] Processing AuctionEnded for Auction: ${payload.auction_id}`);
    
    // Logic:
    // a. Identify if there's a winner
    // b. Send "You Won!" to winner
    // c. Send "Auction Ended" to seller
  });

}
