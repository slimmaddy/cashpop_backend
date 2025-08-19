import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInfo } from '../dto/syncing.dto';
import { Relationship } from '../entities/relationship.entity';
import { SuggestionSource } from '../entities/suggestion.entity';
import {
  SuggestionCandidate,
  SuggestionContext,
  SuggestionStrategyResult
} from '../interfaces/suggestion.interfaces';
import { MutualFriendsCalculator } from '../services/mutual-friends-calculator.service';
import { UserLookupService } from '../services/user-lookup.service';
import { BaseSuggestionStrategy } from './base-suggestion.strategy';

/**
 * 📞 Contact Suggestion Strategy
 * Tạo suggestions từ contact list của user
 * 
 * FRESHER GUIDE:
 * - Extend BaseSuggestionStrategy để tái sử dụng common logic
 * - Chỉ cần implement generateCandidates() method
 * - Strategy pattern giúp dễ extend và test
 */

interface ContactSuggestionData {
  contacts: ContactInfo[];
}

@Injectable()
export class ContactSuggestionStrategy extends BaseSuggestionStrategy {
  readonly source = SuggestionSource.CONTACT;

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    private readonly userLookupService: UserLookupService,
    private readonly mutualFriendsCalculator: MutualFriendsCalculator
  ) {
    super();
  }

  /**
   * 🎯 CORE METHOD: Generate suggestions từ contact list
   * Đây là method chính mà fresher cần hiểu
   */
  async generateCandidates(
    context: SuggestionContext,
    data: ContactSuggestionData
  ): Promise<SuggestionStrategyResult> {
    const startTime = Date.now();

    // ✅ Validate inputs trước khi xử lý
    this.validateContext(context);
    if (!data.contacts || !Array.isArray(data.contacts)) {
      this.logger.warn('Invalid contact data provided');
      return this.createEmptyResult();
    }

    const { contacts } = data;
    const { userEmail, maxSuggestions = 50 } = context;

    this.logger.log(`Processing ${contacts.length} contacts for user: ${userEmail}`);

    try {
      // 🔍 STEP 1: Extract valid emails từ contacts
      const contactEmails = this.extractValidEmails(contacts);

      if (contactEmails.length === 0) {
        this.logger.debug('No valid emails found in contacts');
        return this.createResult([], contacts.length, contacts.length);
      }

      // 🔍 STEP 2: Find CashPop users từ contact emails
      const cashpopUsers = await this.userLookupService.findCashpopUsersByEmails(contactEmails);

      if (cashpopUsers.length === 0) {
        this.logger.debug('No CashPop users found in contacts');
        return this.createResult([], contacts.length, contacts.length);
      }

      this.logger.debug(`Found ${cashpopUsers.length} CashPop users in contacts`);

      // 🔍 STEP 3: Filter out invalid suggestions
      const validCashpopUsers = await this.filterValidSuggestions(userEmail, cashpopUsers);

      if (validCashpopUsers.length === 0) {
        this.logger.debug('No valid suggestion candidates after filtering');
        return this.createResult([], contacts.length, cashpopUsers.length);
      }

      // 🔍 STEP 4: Calculate mutual friends cho tất cả candidates
      const mutualFriendsMap = await this.mutualFriendsCalculator.batchCalculateMutualFriends(
        userEmail,
        validCashpopUsers.map(u => u.email)
      );

      // 🔍 STEP 5: Create suggestion candidates
      const candidates: SuggestionCandidate[] = [];

      for (const cashpopUser of validCashpopUsers) {
        const mutualFriendsResult = mutualFriendsMap.get(cashpopUser.email);
        const contactInfo = contacts.find(c => c.email === cashpopUser.email);

        const candidate = this.createCandidate(
          userEmail,
          cashpopUser.email,
          this.generateReason(mutualFriendsResult?.count || 0),
          mutualFriendsResult?.count || 0,
          {
            contactName: contactInfo?.name || cashpopUser.name,
            mutualFriends: mutualFriendsResult?.friendNames?.slice(0, 3) || [],
            sourceInfo: 'contact_sync'
          }
        );

        candidates.push(candidate);

        // 🚫 Limit số suggestions nếu cần
        if (candidates.length >= maxSuggestions) {
          this.logger.debug(`Reached max suggestions limit: ${maxSuggestions}`);
          break;
        }
      }

      // 🏆 STEP 6: Sort candidates theo priority
      const sortedCandidates = this.sortCandidatesByPriority(candidates);

      const result = this.createResult(
        sortedCandidates,
        contacts.length,
        contacts.length - cashpopUsers.length
      );

      const executionTime = Date.now() - startTime;
      this.logExecution(context, result, executionTime);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Contact strategy failed after ${executionTime}ms:`, error);

      return this.createResult(
        [],
        contacts.length,
        0,
        [`Contact strategy error: ${error.message}`]
      );
    }
  }

  /**
   * 📧 Extract valid emails từ contacts
   * Helper method để clean up contact data
   */
  private extractValidEmails(contacts: ContactInfo[]): string[] {
    return contacts
      .filter(contact => contact.email && this.isValidEmail(contact.email))
      .map(contact => contact.email.toLowerCase().trim());
  }

  /**
   * 🔍 Filter ra những users có thể suggest
   * Loại bỏ existing relationships và self
   */
  private async filterValidSuggestions(userEmail: string, cashpopUsers: any[]): Promise<any[]> {
    const validUsers = [];

    for (const user of cashpopUsers) {
      // Skip self
      if (user.email === userEmail) {
        continue;
      }

      // ✅ Check existing relationship
      const existingRelationship = await this.relationshipRepository.findOne({
        where: [
          { userEmail, friendEmail: user.email },
          { userEmail: user.email, friendEmail: userEmail }
        ]
      });

      if (!existingRelationship) {
        validUsers.push(user);
      }
    }

    return validUsers;
  }

  /**
   * 📝 Generate reason cho suggestion
   * Dynamic reason based on mutual friends count
   */
  private generateReason(mutualFriendsCount: number): string {
    if (mutualFriendsCount > 0) {
      return mutualFriendsCount === 1
        ? 'Found in your contacts • 1 mutual friend'
        : `Found in your contacts • ${mutualFriendsCount} mutual friends`;
    }

    return 'Found in your contacts';
  }

  /**
   * 🏆 Sort candidates theo priority và mutual friends
   * Higher priority và more mutual friends = higher rank
   */
  private sortCandidatesByPriority(candidates: SuggestionCandidate[]): SuggestionCandidate[] {
    return candidates.sort((a, b) => {
      // Sort by priority first (higher first)
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }

      // Then by mutual friends count (higher first)
      if (a.mutualFriendsCount !== b.mutualFriendsCount) {
        return b.mutualFriendsCount - a.mutualFriendsCount;
      }

      // Finally by suggested user email (alphabetical)
      return a.suggestedUserEmail.localeCompare(b.suggestedUserEmail);
    });
  }


  /**
   * 🎯 Override priority calculation cho contact source
   * Contacts có priority cao hơn vì user chủ động import
   */
  calculatePriority(candidate: SuggestionCandidate): number {
    let priority = 6; // Base priority cao hơn default (5)

    // Mutual friends boost
    if (candidate.mutualFriendsCount > 0) {
      priority += Math.min(candidate.mutualFriendsCount * 0.3, 2); // Max +2 points
    }

    // Contact source boost
    priority += 1; // Contact import = user intention

    // Ensure trong range 1-10
    return Math.max(1, Math.min(10, Math.round(priority)));
  }
}