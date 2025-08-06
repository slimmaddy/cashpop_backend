import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from '../entities/friendship.entity';
import { User } from '../../users/entities/user.entity';

import {
  FriendSuggestionResponseDto,
  GetFriendSuggestionsDto
} from '../dto/friend-suggestion.dto';

@Injectable()
export class FriendSuggestionService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  /**
   * Lấy danh sách gợi ý kết bạn thông minh dựa trên mạng lưới bạn bè hiện có.
   * Logic: Bạn của bạn bè, chưa là bạn, chưa gửi lời mời
   */
  async getFriendSuggestions(
    userId: string,
    query: GetFriendSuggestionsDto
  ): Promise<{ suggestions: FriendSuggestionResponseDto[]; total: number }> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Query đơn giản để tìm gợi ý kết bạn
    const rawQuery = `
      WITH user_friends AS (
        -- Lấy danh sách bạn bè của user hiện tại
        SELECT friend_id
        FROM friendships
        WHERE user_id = $1 AND status = 'accepted'
      )
      SELECT DISTINCT
        u.id,
        u.email,
        u.username,
        u.name,
        u.avatar
      FROM users u
      JOIN friendships f2 ON u.id = f2.friend_id AND f2.status = 'accepted'
      WHERE f2.user_id IN (SELECT friend_id FROM user_friends)  -- Bạn của bạn bè
        AND u.id != $1  -- Không phải chính mình
        AND u.id NOT IN (SELECT friend_id FROM user_friends)  -- Chưa là bạn
        AND u.id NOT IN (  -- Chưa gửi/nhận lời mời
          SELECT friend_id FROM friendships
          WHERE user_id = $1 AND status IN ('pending', 'blocked')
          UNION
          SELECT user_id FROM friendships
          WHERE friend_id = $1 AND status IN ('pending', 'blocked')
        )
      ORDER BY u.name ASC
      LIMIT $2 OFFSET $3
    `;

    // Execute query
    const suggestions = await this.friendshipRepository.query(rawQuery, [
      userId,
      limit,
      skip
    ]);

    // Count total suggestions
    const countQuery = `
      WITH user_friends AS (
        SELECT friend_id
        FROM friendships
        WHERE user_id = $1 AND status = 'accepted'
      )
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN friendships f2 ON u.id = f2.friend_id AND f2.status = 'accepted'
      WHERE f2.user_id IN (SELECT friend_id FROM user_friends)
        AND u.id != $1
        AND u.id NOT IN (SELECT friend_id FROM user_friends)
        AND u.id NOT IN (
          SELECT friend_id FROM friendships
          WHERE user_id = $1 AND status IN ('pending', 'blocked')
          UNION
          SELECT user_id FROM friendships
          WHERE friend_id = $1 AND status IN ('pending', 'blocked')
        )
    `;

    const [{ total }] = await this.friendshipRepository.query(countQuery, [userId]);

    // Transform data và lấy mutual friends (không đếm)
    const transformedSuggestions: FriendSuggestionResponseDto[] = await Promise.all(
      suggestions.map(async (suggestion: any) => {
        // Lấy danh sách bạn chung (tối đa 3)
        const mutualFriendsQuery = `
          SELECT u.id, u.name
          FROM users u
          JOIN friendships f1 ON u.id = f1.friend_id
          JOIN friendships f2 ON u.id = f2.friend_id
          WHERE f1.user_id = $1 AND f1.status = 'accepted'
            AND f2.user_id = $2 AND f2.status = 'accepted'
          ORDER BY u.name
          LIMIT 3
        `;

        const mutualFriends = await this.friendshipRepository.query(mutualFriendsQuery, [
          userId,
          suggestion.id
        ]);

        return {
          user: {
            id: suggestion.id,
            email: suggestion.email,
            username: suggestion.username,
            name: suggestion.name,
            avatar: suggestion.avatar,
          },
          mutualFriendsCount: mutualFriends.length, // Đếm từ kết quả query
          mutualFriends: mutualFriends.map((mf: any) => ({
            id: mf.id,
            name: mf.name
          })),
          reason: mutualFriends.length > 0 ? `You have ${mutualFriends.length} mutual friends` : 'Friend suggestion'
        };
      })
    );

    return {
      suggestions: transformedSuggestions,
      total: parseInt(total)
    };
  }
}