import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship } from '../entities/relationship.entity';
import {
  SyncContactDto,
  SyncContactsResponseDto,
  SyncResultDto,
  ContactInfo,
  SyncPlatform
} from '../dto/syncing.dto';
import { FacebookSyncService } from './syncing-facebook.service';
import { LineSyncService } from './syncing-line.service';
import { RelationshipService } from './relationship.service';
import { UserLookupService } from './user-lookup.service';
import { SuggestionService } from './suggestion.service';

@Injectable()
export class SocialSyncService {
  private readonly logger = new Logger(SocialSyncService.name);

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    private readonly facebookSyncService: FacebookSyncService,
    private readonly lineSyncService: LineSyncService,
    private readonly relationshipService: RelationshipService,
    private readonly userLookupService: UserLookupService,
    private readonly suggestionService: SuggestionService,
  ) {}

  /**
   * Main sync contacts method
   */
  async syncContacts(
    userEmail: string, 
    syncDto: SyncContactDto
  ): Promise<SyncContactsResponseDto> {
    this.logger.log(`🚀 Starting sync for ${userEmail} with platform: ${syncDto.platform}`);

    try {
      let contacts: ContactInfo[] = [];

      // Get contacts from platform
      switch (syncDto.platform) {
        case SyncPlatform.FACEBOOK:
          if (!syncDto.facebook?.token) {
            throw new BadRequestException('Facebook access token is required');
          }
          contacts = await this.facebookSyncService.getContacts(syncDto.facebook.token);
          break;

        case SyncPlatform.LINE:
          if (!syncDto.line?.token) {
            throw new BadRequestException('LINE access token is required');
          }
          contacts = await this.lineSyncService.getContacts(syncDto.line.token);
          break;

        case SyncPlatform.CONTACT:
          throw new BadRequestException('Phone contact sync chưa được hỗ trợ');

        default:
          throw new BadRequestException('Platform không được hỗ trợ');
      }

      // Process contacts and create friendships
      const result = await this.processContacts(userEmail, contacts, syncDto.platform);

      return {
        success: true,
        message: `Sync ${syncDto.platform} successfully`,
        result
      };

    } catch (error) {
      this.logger.error(`❌ Sync failed for ${userEmail}:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        platform: syncDto.platform,
        hasToken: !!(syncDto.facebook?.token || syncDto.line?.token)
      });

      return {
        success: false,
        message: error.message || 'Sync failed',
        result: {
          platform: syncDto.platform,
          totalContacts: 0,
          cashpopUsersFound: 0,
          newFriendshipsCreated: 0,
          alreadyFriends: 0,
          errors: [error.message || 'Unknown error'],
          details: {
            contactsProcessed: [],
            newFriends: []
          }
        }
      };
    }
  }

  /**
   * Process contacts and create friendships
   */
  private async processContacts(
    userEmail: string,
    contacts: ContactInfo[],
    platform: SyncPlatform
  ): Promise<SyncResultDto> {
    this.logger.log(`📋 Processing ${contacts.length} contacts for ${userEmail}`);

    const result: SyncResultDto = {
      platform,
      totalContacts: contacts.length,
      cashpopUsersFound: 0,
      newFriendshipsCreated: 0,
      alreadyFriends: 0,
      errors: [],
      details: {
        contactsProcessed: [],
        newFriends: []
      }
    };

    // Find CashPop users from contacts
    const cashpopUsers = await this.userLookupService.findCashpopUsersFromContacts(contacts);
    result.cashpopUsersFound = cashpopUsers.length;

    this.logger.log(`👥 Found ${cashpopUsers.length} CashPop users in contacts`);

    // Create friendships
    for (const cashpopUser of cashpopUsers) {
      try {
        // Skip if trying to friend themselves
        if (cashpopUser.email === userEmail) {
          this.logger.log(`⏭️ Skipping self-friendship for ${userEmail}`);
          continue;
        }

        const friendshipResult = await this.relationshipService.createAutoAcceptedFriendship(
          userEmail,
          cashpopUser.email,
          `Auto-connected via ${platform} sync`
        );

        if (friendshipResult.created) {
          result.newFriendshipsCreated++;
          result.details.newFriends.push({
            email: cashpopUser.email,
            name: cashpopUser.name,
            source: `${platform}_sync`
          });
        } else {
          result.alreadyFriends++;
        }

        result.details.contactsProcessed.push({
          id: cashpopUser.id,
          name: cashpopUser.name,
          email: cashpopUser.email,
          platform
        });

      } catch (error) {
        this.logger.error(`❌ Error creating friendship with ${cashpopUser.email}:`, error.message);
        result.errors.push(`Failed to connect with ${cashpopUser.name}: ${error.message}`);
      }
    }

    // Tạo suggestions cho những contacts không thể tạo friendship
    try {
      const suggestionResult = await this.suggestionService.createSuggestionsFromContacts(userEmail, contacts);
      this.logger.log(`💡 Created ${suggestionResult.created} suggestions, skipped ${suggestionResult.skipped}`);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to create suggestions: ${error.message}`);
    }

    this.logger.log(`✅ Sync completed: ${result.newFriendshipsCreated} new friends, ${result.alreadyFriends} already friends`);
    return result;
  }




  /**
   * Test sync with mock data
   */
  async testSync(userEmail: string, platform: SyncPlatform): Promise<SyncContactsResponseDto> {
    this.logger.log(`🧪 Testing sync for ${userEmail} with platform: ${platform}`);

    try {
      let contacts: ContactInfo[] = [];

      switch (platform) {
        case SyncPlatform.FACEBOOK:
          contacts = await this.facebookSyncService.getMockContacts();
          break;
        case SyncPlatform.LINE:
          contacts = await this.lineSyncService.getMockContacts();
          break;
        default:
          throw new BadRequestException('Test chỉ hỗ trợ Facebook và LINE platform');
      }

      const result = await this.processContacts(userEmail, contacts, platform);

      return {
        success: true,
        message: `Test sync ${platform} successfully`,
        result
      };

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Test sync failed',
        result: {
          platform,
          totalContacts: 0,
          cashpopUsersFound: 0,
          newFriendshipsCreated: 0,
          alreadyFriends: 0,
          errors: [error.message],
          details: {
            contactsProcessed: [],
            newFriends: []
          }
        }
      };
    }
  }

  /**
   * Get sync history for user
   */
  async getSyncHistory(userEmail: string): Promise<any[]> {
    const syncedRelationships = await this.relationshipRepository
      .createQueryBuilder('relationship')
      .where('relationship.userEmail = :userEmail', { userEmail })
      .andWhere('relationship.message LIKE :syncPattern', { syncPattern: '%sync%' })
      .orderBy('relationship.createdAt', 'DESC')
      .getMany();

    return syncedRelationships;
  }
}
