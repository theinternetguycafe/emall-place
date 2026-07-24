import { Channel, MessageCategory, UserCommunicationPreferences } from './types';

/**
 * Mock Preferences Service.
 * In production, this would query the `user_communication_preferences` table.
 */
export class PreferencesService {
  
  static async getUserPreferences(userId: string): Promise<UserCommunicationPreferences> {
    // Mocked return: User wants Transactional emails and push, but NO marketing.
    return {
      user_id: userId,
      categories: {
        [MessageCategory.TRANSACTIONAL]: true,
        [MessageCategory.MARKETING]: false,
        [MessageCategory.SYSTEM]: true,
        [MessageCategory.SECURITY]: true,
      },
      channels: {
        [Channel.EMAIL]: true,
        [Channel.PUSH]: true,
        [Channel.SMS]: false,
      }
    };
  }

  /**
   * Evaluates if a specific channel and category combination is allowed for this user.
   */
  static isAllowed(prefs: UserCommunicationPreferences, channel: Channel, category: MessageCategory): boolean {
    return prefs.categories[category] === true && prefs.channels[channel] === true;
  }
}
