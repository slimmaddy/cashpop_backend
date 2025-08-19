import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { UsersService } from "../../users/users.service";
import {
  Relationship
} from "../entities/relationship.entity";
import {
  Suggestion,
  SuggestionSource,
  SuggestionStatus,
} from "../entities/suggestion.entity";
import {
  InvalidCandidateException,
  MutualFriendsCalculationException,
  SuggestionDataException
} from "../exceptions/suggestion.exceptions";
import { MutualFriendsCalculator } from "./mutual-friends-calculator.service";
import { UserLookupService } from "./user-lookup.service";

import {
  GetSuggestionsDto,
  SuggestionResponseDto,
} from "../dto/suggestion.dto";

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    @InjectRepository(Relationship)
    private relationshipRepository: Repository<Relationship>,
    @InjectRepository(Suggestion)
    private suggestionRepository: Repository<Suggestion>,
    private usersService: UsersService,
    private userLookupService: UserLookupService,
    private mutualFriendsCalculator: MutualFriendsCalculator
  ) { }
  /**
   * Lấy danh sách gợi ý kết bạn từ bảng suggestions
   */
  async getSuggestions(
    userEmail: string,
    query: GetSuggestionsDto
  ): Promise<{ suggestions: SuggestionResponseDto[]; total: number }> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Query suggestions từ bảng suggestions với JOIN users
    const [suggestions, total] = await this.suggestionRepository.findAndCount({
      where: {
        userEmail,
        status: SuggestionStatus.ACTIVE,
      },
      relations: ["suggestedUser"],
      order: {
        mutualFriendsCount: "DESC",
        createdAt: "DESC",
      },
      take: limit,
      skip,
    });

    // Transform data
    const transformedSuggestions: SuggestionResponseDto[] = suggestions.map(
      (suggestion) => ({
        user: {
          id: suggestion.suggestedUser.id,
          email: suggestion.suggestedUser.email,
          username: suggestion.suggestedUser.username,
          name: suggestion.suggestedUser.name,
          avatar: suggestion.suggestedUser.avatar,
        },
        mutualFriendsCount: suggestion.mutualFriendsCount,
        mutualFriends: this.extractMutualFriends(suggestion.metadata),
        reason:
          suggestion.reason ||
          this.getReasonBySource(
            suggestion.source,
            suggestion.mutualFriendsCount
          ),
      })
    );

    return {
      suggestions: transformedSuggestions,
      total,
    };
  }

  /**
   * Helper method để extract mutual friends từ metadata
   */
  private extractMutualFriends(
    metadata: any
  ): Array<{ id: string; name: string }> {
    if (!metadata || !metadata.mutual_friends) {
      return [];
    }

    // Nếu metadata chứa array of names, convert thành format cần thiết
    if (Array.isArray(metadata.mutual_friends)) {
      return metadata.mutual_friends.map((name: string, index: number) => ({
        id: `mutual-${index}`, // Temporary ID since we don't store actual IDs
        name,
      }));
    }

    return [];
  }

  /**
   * Helper method để generate reason based on source
   */
  private getReasonBySource(
    source: SuggestionSource,
    mutualFriendsCount: number
  ): string {
    switch (source) {
      case SuggestionSource.MUTUAL_FRIENDS:
        return mutualFriendsCount > 1
          ? `You have ${mutualFriendsCount} mutual friends`
          : "You have 1 mutual friend";
      case SuggestionSource.CONTACT:
        return "From your contacts";
      case SuggestionSource.FACEBOOK:
        return "From Facebook friends";
      case SuggestionSource.LINE:
        return "From LINE friends";
      default:
        return "Suggested for you";
    }
  }

  /**
   * ✅ ENHANCED: Tạo suggestions từ danh sách contacts với proper error handling
   */
  async createSuggestionsFromContacts(
    userEmail: string,
    contacts: any[]
  ): Promise<{ created: number; skipped: number }> {
    const startTime = Date.now();

    try {
      // ✅ Input validation
      if (!userEmail || typeof userEmail !== 'string') {
        throw new InvalidCandidateException('Invalid userEmail provided');
      }

      if (!contacts || !Array.isArray(contacts)) {
        throw new SuggestionDataException('contacts', contacts, 'array');
      }

      this.logger.log(`Creating suggestions from ${contacts.length} contacts for ${userEmail}`);

      const emails = contacts
        .filter(
          (contact) =>
            contact.email && this.userLookupService.isValidEmail(contact.email)
        )
        .map((contact) => contact.email);

      if (emails.length === 0) {
        this.logger.debug('No valid emails found in contacts');
        return { created: 0, skipped: 0 };
      }

      this.logger.debug(`Found ${emails.length} valid emails in ${contacts.length} contacts`);

      // Tìm CashPop users từ contacts
      const cashpopUsers = await this.userLookupService.findCashpopUsersByEmails(
        emails
      );

      this.logger.debug(`Found ${cashpopUsers.length} CashPop users from emails`);

      let created = 0;
      let skipped = 0;

      for (const user of cashpopUsers) {
        // Skip self
        if (user.email === userEmail) {
          skipped++;
          continue;
        }

        // Kiểm tra đã có relationship chưa
        const existingRelationship = await this.relationshipRepository.findOne({
          where: [
            { userEmail, friendEmail: user.email },
            { userEmail: user.email, friendEmail: userEmail },
          ],
        });

        if (existingRelationship) {
          skipped++;
          continue;
        }

        // Kiểm tra đã có suggestion chưa
        const existingSuggestion = await this.suggestionRepository.findOne({
          where: {
            userEmail,
            suggestedUserEmail: user.email,
            status: SuggestionStatus.ACTIVE,
          },
        });

        if (existingSuggestion) {
          skipped++;
          continue;
        }

        // Tạo suggestion mới
        try {
          const mutualFriendsCount = await this.getMutualFriendsCount(
            userEmail,
            user.email
          );

          const suggestion = this.suggestionRepository.create({
            userEmail,
            suggestedUserEmail: user.email,
            source: SuggestionSource.CONTACT,
            status: SuggestionStatus.ACTIVE,
            reason: "Found in your contacts",
            mutualFriendsCount,
            metadata: {
              source_info: "contact_sync",
              contact_name:
                contacts.find((c) => c.email === user.email)?.name || user.name,
            },
          });

          await this.suggestionRepository.save(suggestion);
          created++;
        } catch (error) {
          this.logger.error(`Error creating suggestion for ${user.email}:`, error);
          skipped++;
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Suggestions creation completed in ${executionTime}ms: ${created} created, ${skipped} skipped`
      );

      return { created, skipped };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Critical error in createSuggestionsFromContacts after ${executionTime}ms:`,
        error
      );

      // Re-throw custom exceptions, wrap others
      if (error instanceof InvalidCandidateException ||
        error instanceof SuggestionDataException ||
        error instanceof MutualFriendsCalculationException) {
        throw error;
      }

      throw new SuggestionDataException(
        'suggestion_creation',
        'process_failed',
        `Failed to process contacts: ${error.message}`
      );
    }
  }

  /**
   * ✅ ENHANCED: Sử dụng MutualFriendsCalculator với proper error handling
   * Đếm số bạn chung giữa 2 users
   */
  private async getMutualFriendsCount(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<number> {
    try {
      if (!userEmail || !suggestedUserEmail) {
        throw new InvalidCandidateException('Missing required emails for mutual friends calculation');
      }

      return await this.mutualFriendsCalculator.getMutualFriendsCount(
        userEmail,
        suggestedUserEmail
      );
    } catch (error) {
      this.logger.error(
        `Failed to get mutual friends count for ${userEmail} <-> ${suggestedUserEmail}:`,
        error
      );

      if (error instanceof InvalidCandidateException) {
        throw error;
      }

      throw new MutualFriendsCalculationException(userEmail, suggestedUserEmail, error);
    }
  }

  /**
   * Tìm user theo email (sử dụng UserLookupService)
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userLookupService.getUserByEmail(email);
  }

  /**
   * Gợi ý user dựa trên email search
   */
  async getSuggestionByEmail(
    userEmail: string,
    searchEmail: string
  ): Promise<SuggestionResponseDto | null> {
    // Tìm suggested user theo email
    const suggestedUser = await this.usersService.findByEmail(searchEmail);

    if (!suggestedUser || suggestedUser.email === userEmail) {
      return null; // Không tìm thấy hoặc là chính mình
    }

    // Kiểm tra đã là bạn chưa
    const existingRelationship = await this.relationshipRepository.findOne({
      where: [
        { userEmail, friendEmail: searchEmail },
        { userEmail: searchEmail, friendEmail: userEmail },
      ],
    });

    if (existingRelationship) {
      return null; // Đã có relationship
    }

    // Kiểm tra đã có suggestion chưa
    const existingSuggestion = await this.suggestionRepository.findOne({
      where: {
        userEmail,
        suggestedUserEmail: searchEmail,
        status: SuggestionStatus.ACTIVE,
      },
    });

    if (existingSuggestion) {
      // Trả về suggestion đã có
      return {
        user: {
          id: suggestedUser.id,
          email: suggestedUser.email,
          username: suggestedUser.username,
          name: suggestedUser.name,
          avatar: suggestedUser.avatar,
        },
        mutualFriendsCount: existingSuggestion.mutualFriendsCount,
        mutualFriends: this.extractMutualFriends(existingSuggestion.metadata),
        reason: existingSuggestion.reason || "Found by email search",
      };
    }

    // Tạo suggestion mới nếu chưa có
    const newSuggestion = await this.createSuggestionByEmail(
      userEmail,
      searchEmail
    );

    if (!newSuggestion) {
      return null;
    }

    // Trả về suggestion mới tạo
    return {
      user: {
        id: suggestedUser.id,
        email: suggestedUser.email,
        username: suggestedUser.username,
        name: suggestedUser.name,
        avatar: suggestedUser.avatar,
      },
      mutualFriendsCount: newSuggestion.mutualFriendsCount,
      mutualFriends: this.extractMutualFriends(newSuggestion.metadata),
      reason: newSuggestion.reason || "Found by email search",
    };
  }

  /**
   * Tạo suggestion mới từ email search
   */
  private async createSuggestionByEmail(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<Suggestion | null> {
    try {
      // Tính mutual friends count
      const mutualFriendsCount = await this.calculateMutualFriendsCount(
        userEmail,
        suggestedUserEmail
      );

      const suggestion = this.suggestionRepository.create({
        userEmail,
        suggestedUserEmail,
        source:
          mutualFriendsCount > 0
            ? SuggestionSource.MUTUAL_FRIENDS
            : SuggestionSource.CONTACT,
        status: SuggestionStatus.ACTIVE,
        reason:
          mutualFriendsCount > 0
            ? `You have ${mutualFriendsCount} mutual friends`
            : "Found by email search",
        mutualFriendsCount,
        metadata:
          mutualFriendsCount > 0
            ? await this.getMutualFriendsMetadata(userEmail, suggestedUserEmail)
            : { source_info: "email_search" },
      });

      return await this.suggestionRepository.save(suggestion);
    } catch (error) {
      console.error("Error creating suggestion:", error);
      return null;
    }
  }

  /**
   * ✅ REFACTORED: Sử dụng MutualFriendsCalculator thay vì raw SQL
   * Tính số lượng mutual friends với full result
   */
  private async calculateMutualFriendsCount(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<number> {
    const result = await this.mutualFriendsCalculator.calculateMutualFriends(
      userEmail,
      suggestedUserEmail
    );
    return result.count;
  }

  /**
   * ✅ REFACTORED: Sử dụng MutualFriendsCalculator thay vì raw SQL
   * Lấy thông tin mutual friends cho metadata (top 3 friends)
   */
  private async getMutualFriendsMetadata(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<any> {
    const { names, totalCount } = await this.mutualFriendsCalculator.getTopMutualFriends(
      userEmail,
      suggestedUserEmail,
      3
    );

    return {
      mutual_friends: names,
      total_mutual_friends: totalCount,
      source_info: "email_search",
    };
  }
}
