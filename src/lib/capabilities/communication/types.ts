export enum Priority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

export enum Channel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS'
}

export enum MessageCategory {
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY'
}

/**
 * The canonical Message object that is enqueued and processed by Providers.
 */
export interface Message {
  id: string;
  recipient_id: string;
  channel: Channel;
  category: MessageCategory;
  priority: Priority;
  
  // Rendered Content
  subject?: string;
  body: string;
  
  // Future extensibility
  attachments?: any[];
  metadata?: Record<string, any>;
}

/**
 * User Preferences separate the WHAT (category) from the HOW (channel).
 */
export interface UserCommunicationPreferences {
  user_id: string;
  
  categories: {
    [MessageCategory.TRANSACTIONAL]: boolean;
    [MessageCategory.MARKETING]: boolean;
    [MessageCategory.SYSTEM]: boolean;
    [MessageCategory.SECURITY]: boolean;
  };
  
  channels: {
    [Channel.EMAIL]: boolean;
    [Channel.PUSH]: boolean;
    [Channel.SMS]: boolean;
  };
}
