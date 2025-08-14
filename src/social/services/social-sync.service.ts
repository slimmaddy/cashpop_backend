import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import {
  InvalidSyncTokenException,
  PlatformSyncNotSupportedException,
  SyncRateLimitException,
} from "../exceptions/social.exceptions";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Relationship } from "../entities/relationship.entity";
import {
  SyncContactDto,
  SyncContactsResponseDto,
  SyncResultDto,
  ContactInfo,
  SyncPlatform,
} from "../dto/syncing.dto";
import { FacebookSyncService } from "./syncing-facebook.service";
import { LineSyncService } from "./syncing-line.service";
import { RelationshipService } from "./relationship.service";
import { UserContextService } from "./user-context.service";
import { SuggestionService } from "./suggestion.service";

/**
 * ✅ OPTIMIZED: Enhanced SocialSyncService with improved performance, error handling, and batch processing
 * Key optimizations:
 * - Configurable batch processing for large contact lists
 * - Enhanced error handling with detailed logging
 * - Performance metrics and execution time tracking  
 * - Rate limiting and delay management
 * - Improved mock data for testing
 * - Background suggestion creation
 * - Comprehensive sync history with statistics
 */

@Injectable()
export class SocialSyncService {
  private readonly logger = new Logger(SocialSyncService.name);

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    private readonly facebookSyncService: FacebookSyncService,
    private readonly lineSyncService: LineSyncService,
    private readonly relationshipService: RelationshipService,
    private readonly userContextService: UserContextService,
    private readonly suggestionService: SuggestionService
  ) {}

  /**
   * ✅ OPTIMIZED: Main sync contacts method with enhanced error handling and performance tracking
   */
  async syncContacts(
    userEmail: string,
    syncDto: SyncContactDto,
    options: {
      maxContacts?: number;
      batchSize?: number;
      skipDuplicateCheck?: boolean;
      createSuggestions?: boolean;
    } = {}
  ): Promise<SyncContactsResponseDto> {
    const { maxContacts = 5000, batchSize = 100, skipDuplicateCheck = false, createSuggestions = true } = options;
    const startTime = Date.now();
    
    this.logger.log(
      `🚀 Starting optimized sync for ${userEmail} with platform: ${syncDto.platform} (max: ${maxContacts})`
    );

    try {
      let contacts: ContactInfo[] = [];

      // ✅ OPTIMIZE: Get contacts from platform with performance options
      switch (syncDto.platform) {
        case SyncPlatform.FACEBOOK:
          if (!syncDto.facebook?.token) {
            throw new InvalidSyncTokenException("Facebook", "Token is required");
          }
          contacts = await this.facebookSyncService.getContacts(
            syncDto.facebook.token,
            { batchSize, maxContacts }
          );
          break;

        case SyncPlatform.LINE:
          if (!syncDto.line?.token) {
            throw new InvalidSyncTokenException("LINE", "Token is required");
          }
          contacts = await this.lineSyncService.getContacts(
            syncDto.line.token, 
            { maxContacts }
          );
          break;

        case SyncPlatform.CONTACT:
          throw new PlatformSyncNotSupportedException("Phone contacts");

        default:
          throw new PlatformSyncNotSupportedException(syncDto.platform);
      }

      // ✅ OPTIMIZE: Process contacts with enhanced options
      const result = await this.processContacts(
        userEmail,
        contacts,
        syncDto.platform,
        { skipDuplicateCheck, createSuggestions, batchSize }
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Sync completed in ${executionTime}ms`);

      return {
        success: true,
        message: `Sync ${syncDto.platform} successfully completed in ${executionTime}ms`,
        result: {
          ...result,
          executionTime
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`❌ Sync failed for ${userEmail} after ${executionTime}ms:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        platform: syncDto.platform,
        hasToken: !!(syncDto.facebook?.token || syncDto.line?.token),
        executionTime
      });

      return {
        success: false,
        message: error.message || "Sync failed",
        result: {
          platform: syncDto.platform,
          totalContacts: 0,
          cashpopUsersFound: 0,
          newFriendshipsCreated: 0,
          alreadyFriends: 0,
          errors: [error.message || "Unknown error"],
          details: {
            contactsProcessed: [],
            newFriends: [],
          },
          executionTime
        },
      };
    }
  }

  /**
   * ✅ OPTIMIZED: Process contacts and create friendships with batch processing and improved performance
   */
  private async processContacts(
    userEmail: string,
    contacts: ContactInfo[],
    platform: SyncPlatform,
    options: {
      skipDuplicateCheck?: boolean;
      createSuggestions?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<SyncResultDto> {
    const { skipDuplicateCheck = false, createSuggestions = true, batchSize = 50 } = options;
    const startTime = Date.now();
    
    this.logger.log(
      `📋 Processing ${contacts.length} contacts for ${userEmail} (batch: ${batchSize})`
    );

    const result: SyncResultDto = {
      platform,
      totalContacts: contacts.length,
      cashpopUsersFound: 0,
      newFriendshipsCreated: 0,
      alreadyFriends: 0,
      errors: [],
      details: {
        contactsProcessed: [],
        newFriends: [],
      },
    };

    if (contacts.length === 0) {
      this.logger.warn(`⚠️ No contacts to process for ${userEmail}`);
      return result;
    }

    try {
      // ✅ OPTIMIZE: Find CashPop users from contacts with caching
      const cashpopUsers = await this.userContextService.findCashpopUsersFromContacts(contacts);
      result.cashpopUsersFound = cashpopUsers.length;

      this.logger.log(
        `👥 Found ${cashpopUsers.length} CashPop users in ${contacts.length} contacts`
      );

      if (cashpopUsers.length === 0) {
        this.logger.log(`💭 No CashPop users found in contacts, ${createSuggestions ? 'creating suggestions' : 'skipping suggestions'}`);
      } else {
        // ✅ OPTIMIZE: Process friendships in batches to avoid overwhelming the database
        const userBatches = this.chunkArray(cashpopUsers, batchSize);
        
        for (let i = 0; i < userBatches.length; i++) {
          const batch = userBatches[i];
          this.logger.log(`🔄 Processing friendship batch ${i + 1}/${userBatches.length} (${batch.length} users)`);
          
          // Process batch in parallel with concurrency control
          const batchPromises = batch.map(async (cashpopUser) => {
            try {
              // Skip if trying to friend themselves
              if (cashpopUser.email === userEmail) {
                this.logger.debug(`⏭️ Skipping self-friendship for ${userEmail}`);
                return { skipped: true, reason: 'self-friendship' };
              }

              // ✅ OPTIMIZE: Skip duplicate check if requested (for performance)
              let friendshipResult;
              if (skipDuplicateCheck) {
                friendshipResult = await this.relationshipService.createAutoAcceptedFriendship(
                  userEmail,
                  cashpopUser.email,
                  `Auto-connected via ${platform} sync`
                );
              } else {
                // Check existing relationship first
                const existing = await this.relationshipService.checkExistingRelationship(
                  userEmail,
                  cashpopUser.email
                );
                
                if (existing) {
                  return { skipped: true, reason: 'already-exists', existing };
                }
                
                friendshipResult = await this.relationshipService.createAutoAcceptedFriendship(
                  userEmail,
                  cashpopUser.email,
                  `Auto-connected via ${platform} sync`
                );
              }

              return { 
                user: cashpopUser, 
                created: friendshipResult.created,
                message: friendshipResult.message,
                relationship: friendshipResult.relationship
              };
            } catch (error) {
              this.logger.error(
                `❌ Error creating friendship with ${cashpopUser.email}:`,
                error.message
              );
              return { 
                user: cashpopUser, 
                error: error.message,
                created: false 
              };
            }
          });

          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Process batch results
          batchResults.forEach((batchResult) => {
            if ('skipped' in batchResult) {
              if (batchResult.reason === 'already-exists') {
                result.alreadyFriends++;
              }
              return;
            }
            
            if ('error' in batchResult) {
              result.errors.push(
                `Failed to connect with ${batchResult.user.name}: ${batchResult.error}`
              );
              return;
            }
            
            if (batchResult.created) {
              result.newFriendshipsCreated++;
              result.details.newFriends.push({
                email: batchResult.user.email,
                name: batchResult.user.name,
                source: `${platform}_sync`,
              });
            } else {
              result.alreadyFriends++;
            }

            result.details.contactsProcessed.push({
              id: batchResult.user.id,
              name: batchResult.user.name,
              email: batchResult.user.email,
              platform,
            });
          });
          
          // Small delay between batches to prevent overwhelming the system
          if (i < userBatches.length - 1) {
            await this.delay(50);
          }
        }
      }

      // ✅ OPTIMIZE: Create suggestions in background if enabled
      if (createSuggestions) {
        try {
          const suggestionResult = await this.suggestionService.createSuggestionsFromContacts(
            userEmail,
            contacts
          );
          this.logger.log(
            `💡 Created ${suggestionResult.created} suggestions, skipped ${suggestionResult.skipped}`
          );
        } catch (error) {
          this.logger.warn(`⚠️ Failed to create suggestions: ${error.message}`);
          result.errors.push(`Suggestion creation failed: ${error.message}`);
        }
      } else {
        this.logger.log(`⏭️ Skipped suggestion creation as requested`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Sync processing completed in ${processingTime}ms: ${result.newFriendshipsCreated} new friends, ${result.alreadyFriends} already friends, ${result.errors.length} errors`
      );
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Contact processing failed after ${processingTime}ms:`, error.message);
      result.errors.push(`Processing failed: ${error.message}`);
      return result;
    }
  }
  
  /**
   * ✅ ADD: Helper method to chunk arrays for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * ✅ ADD: Helper method for delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ✅ OPTIMIZE: Enhanced test sync with configurable mock data and performance testing
   */
  async testSync(
    userEmail: string,
    platform: SyncPlatform,
    options: {
      contactCount?: number;
      simulateDelay?: boolean;
      testConcurrency?: boolean;
      skipSuggestions?: boolean;
    } = {}
  ): Promise<SyncContactsResponseDto> {
    const { contactCount, simulateDelay = false, testConcurrency = false, skipSuggestions = false } = options;
    const startTime = Date.now();
    
    this.logger.log(
      `🧪 Testing sync for ${userEmail} with platform: ${platform} (${contactCount ? `${contactCount} contacts` : 'default count'})`
    );

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
          throw new BadRequestException(
            "Test chỉ hỗ trợ Facebook và LINE platform"
          );
      }

      // Adjust contact count if requested
      if (contactCount && contactCount > 0) {
        // Duplicate contacts if we need more than available
        if (contactCount > contacts.length) {
          const multiplier = Math.ceil(contactCount / contacts.length);
          const expandedContacts: ContactInfo[] = [];
          
          for (let i = 0; i < multiplier; i++) {
            contacts.forEach((contact, index) => {
              expandedContacts.push({
                ...contact,
                id: `${contact.id}_${i}`,
                name: `${contact.name} ${i > 0 ? `(${i})` : ''}`,
                email: contact.email.replace('@', `+${i}@`)
              });
            });
          }
          contacts = expandedContacts.slice(0, contactCount);
        } else {
          contacts = contacts.slice(0, contactCount);
        }
      }

      this.logger.log(`📋 Test processing ${contacts.length} mock contacts`);

      // Simulate network delay if requested
      if (simulateDelay) {
        const delay = Math.random() * 1000 + 500; // 500-1500ms
        this.logger.log(`⏱️ Simulating network delay of ${Math.round(delay)}ms`);
        await this.delay(delay);
      }

      // Process with test-specific options
      const result = await this.processContacts(
        userEmail, 
        contacts, 
        platform,
        {
          createSuggestions: !skipSuggestions,
          batchSize: testConcurrency ? 10 : 50,
          skipDuplicateCheck: testConcurrency
        }
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Test sync completed in ${executionTime}ms`);

      return {
        success: true,
        message: `Test sync ${platform} successfully completed in ${executionTime}ms`,
        result: {
          ...result,
          executionTime,
          testMode: true
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Test sync failed after ${executionTime}ms:`, error.message);
      
      return {
        success: false,
        message: error.message || "Test sync failed",
        result: {
          platform,
          totalContacts: 0,
          cashpopUsersFound: 0,
          newFriendshipsCreated: 0,
          alreadyFriends: 0,
          errors: [error.message],
          details: {
            contactsProcessed: [],
            newFriends: [],
          },
          executionTime,
          testMode: true
        },
      };
    }
  }

  /**
   * ✅ OPTIMIZE: Enhanced sync history with detailed statistics and performance metrics
   */
  async getSyncHistory(userEmail: string, options: {
    limit?: number;
    platform?: SyncPlatform;
    includeStats?: boolean;
  } = {}): Promise<{
    history: any[];
    stats?: {
      totalSynced: number;
      byPlatform: Record<string, number>;
      recentSyncs: number;
      avgSyncFrequency?: number;
    };
  }> {
    const { limit = 50, platform, includeStats = true } = options;
    
    try {
      // Build query
      let query = this.relationshipRepository
        .createQueryBuilder("relationship")
        .leftJoin("users", "friend", "friend.email = relationship.friendEmail")
        .select([
          "relationship.id",
          "relationship.friendEmail", 
          "relationship.message",
          "relationship.createdAt",
          "relationship.acceptedAt",
          "friend.name as friendName",
          "friend.username as friendUsername"
        ])
        .where("relationship.userEmail = :userEmail", { userEmail })
        .andWhere("relationship.message LIKE :syncPattern", {
          syncPattern: "%sync%",
        })
        .orderBy("relationship.createdAt", "DESC");

      // Filter by platform if specified  
      if (platform) {
        query = query.andWhere("relationship.message LIKE :platformPattern", {
          platformPattern: `%${platform}%`,
        });
      }
      
      if (limit > 0) {
        query = query.limit(limit);
      }

      const syncedRelationships = await query.getRawMany();

      let stats = undefined;
      if (includeStats) {
        // Calculate statistics
        const allSynced = await this.relationshipRepository
          .createQueryBuilder("relationship")
          .where("relationship.userEmail = :userEmail", { userEmail })
          .andWhere("relationship.message LIKE :syncPattern", {
            syncPattern: "%sync%",
          })
          .getMany();

        // Group by platform
        const byPlatform: Record<string, number> = {};
        allSynced.forEach(rel => {
          if (rel.message?.includes('facebook')) {
            byPlatform['facebook'] = (byPlatform['facebook'] || 0) + 1;
          } else if (rel.message?.includes('line')) {
            byPlatform['line'] = (byPlatform['line'] || 0) + 1;
          } else {
            byPlatform['other'] = (byPlatform['other'] || 0) + 1;
          }
        });

        // Recent syncs (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSyncs = allSynced.filter(rel => rel.createdAt > thirtyDaysAgo).length;

        stats = {
          totalSynced: allSynced.length,
          byPlatform,
          recentSyncs,
          avgSyncFrequency: allSynced.length > 0 ? recentSyncs / 30 : 0
        };
      }

      this.logger.log(`📈 Retrieved sync history for ${userEmail}: ${syncedRelationships.length} records`);
      
      return {
        history: syncedRelationships,
        stats
      };
    } catch (error) {
      this.logger.error(`❌ Error retrieving sync history for ${userEmail}:`, error.message);
      return {
        history: [],
        stats: includeStats ? {
          totalSynced: 0,
          byPlatform: {},
          recentSyncs: 0
        } : undefined
      };
    }
  }
}
