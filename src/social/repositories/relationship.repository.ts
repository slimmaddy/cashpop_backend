import { Injectable } from "@nestjs/common";
import { DataSource, Repository, SelectQueryBuilder } from "typeorm";
import { Relationship, RelationshipStatus } from "../entities/relationship.entity";
import { CursorConfig, CursorPaginationResponseDto } from "../dto/cursor-pagination.dto";

interface FriendQueryResult {
  relationship_id: string;
  relationship_useremail: string;
  relationship_friendemail: string;
  relationship_status: RelationshipStatus;
  relationship_initiatedby: string;
  relationship_message: string | null;
  relationship_createdat: Date;
  relationship_acceptedat: Date | null;
  friend_id: string | null;
  friend_name: string | null;
  friend_username: string | null;
  friend_avatar: string | null;
}

@Injectable()
export class RelationshipRepository extends Repository<Relationship> {
  constructor(private dataSource: DataSource) {
    super(Relationship, dataSource.createEntityManager());
  }

  /**
   * Get friends with user data in single query
   */
  async findFriendsWithUserData(
    userEmail: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ data: FriendQueryResult[]; total: number }> {
    const offset = (page - 1) * limit;

    // Main query with JOIN
    const queryBuilder = this.createQueryBuilder("relationship")
      .leftJoin("users", "friend", "friend.email = relationship.friendEmail")
      .select([
        "relationship.id as relationship_id",
        "relationship.userEmail as relationship_useremail",
        "relationship.friendEmail as relationship_friendemail",
        "relationship.status as relationship_status",
        "relationship.initiatedBy as relationship_initiatedby",
        "relationship.message as relationship_message",
        "relationship.createdAt as relationship_createdat",
        "relationship.acceptedAt as relationship_acceptedat",
        "friend.id as friend_id",
        "friend.name as friend_name",
        "friend.username as friend_username",
        "friend.avatar as friend_avatar"
      ])
      .where("relationship.userEmail = :userEmail AND relationship.status = :status", {
        userEmail,
        status: RelationshipStatus.ACCEPTED,
      });

    // Add search condition
    if (search) {
      queryBuilder.andWhere(
        "(relationship.friendEmail ILIKE :search OR friend.name ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Add ordering and pagination
    queryBuilder
      .orderBy("relationship.createdAt", "DESC")
      .limit(limit)
      .offset(offset);

    const data = await queryBuilder.getRawMany<FriendQueryResult>();

    // Get total count with same conditions
    const countQuery = this.createCountQuery(userEmail, search);
    const total = await countQuery.getCount();

    return { data, total };
  }

  /**
   * Get friend requests with sender data in single query
   */
  async findFriendRequestsWithUserData(
    userEmail: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: FriendQueryResult[]; total: number }> {
    const offset = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder("relationship")
      .leftJoin("users", "sender", "sender.email = relationship.userEmail")
      .select([
        "relationship.id as relationship_id",
        "relationship.userEmail as relationship_useremail",
        "relationship.message as relationship_message",
        "relationship.createdAt as relationship_createdat",
        "sender.id as friend_id",
        "sender.name as friend_name",
        "sender.username as friend_username",
        "sender.avatar as friend_avatar"
      ])
      .where("relationship.friendEmail = :userEmail AND relationship.status = :status", {
        userEmail,
        status: RelationshipStatus.PENDING,
      })
      .orderBy("relationship.createdAt", "DESC")
      .limit(limit)
      .offset(offset);

    const data = await queryBuilder.getRawMany<FriendQueryResult>();

    // Get total count
    const total = await this.count({
      where: {
        friendEmail: userEmail,
        status: RelationshipStatus.PENDING,
      }
    });

    return { data, total };
  }

  /**
   * Find relationship between two users (bidirectional)
   */
  async findBidirectionalRelationship(
    userEmail: string,
    friendEmail: string
  ): Promise<{ primary: Relationship | null; reverse: Relationship | null }> {
    const [primary, reverse] = await Promise.all([
      this.findOne({ where: { userEmail, friendEmail } }),
      this.findOne({ where: { userEmail: friendEmail, friendEmail: userEmail } }),
    ]);

    return { primary, reverse };
  }

  /**
   * Create or update relationship with optimistic concurrency
   */
  async createRelationshipSafely(
    userEmail: string,
    friendEmail: string,
    status: RelationshipStatus,
    initiatedBy: string,
    message?: string
  ): Promise<{ created: boolean; relationship: Relationship | null }> {
    try {
      // Use INSERT ... ON CONFLICT DO UPDATE pattern
      const relationship = this.create({
        userEmail,
        friendEmail,
        status,
        initiatedBy,
        message,
        acceptedAt: status === RelationshipStatus.ACCEPTED ? new Date() : null,
      });

      const saved = await this.save(relationship);
      return { created: true, relationship: saved };
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        const existing = await this.findOne({ where: { userEmail, friendEmail } });
        return { created: false, relationship: existing };
      }
      throw error;
    }
  }

  /**
   * Update relationship status with timestamp
   */
  async updateRelationshipStatus(
    relationshipId: string,
    status: RelationshipStatus,
    userId?: string
  ): Promise<boolean> {
    const updateData: any = { status };

    // Add timestamp for specific statuses
    if (status === RelationshipStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    } else if (status === RelationshipStatus.BLOCKED) {
      updateData.blockedAt = new Date();
    }

    const result = await this.update({ id: relationshipId }, updateData);
    return result.affected > 0;
  }

  /**
   * Get sync history for user
   */
  async findSyncHistory(userEmail: string, limit: number = 50): Promise<Relationship[]> {
    return this.find({
      where: { userEmail },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Clean up expired relationships (if needed)
   */
  async cleanupExpiredRelationships(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.delete({
      status: RelationshipStatus.REJECTED,
      createdAt: { $lt: cutoffDate } as any,
    });

    return result.affected || 0;
  }

  /**
   * ✅ CURSOR PAGINATION: Get friends with cursor-based pagination
   */
  async findFriendsWithCursor(
    userEmail: string,
    cursor?: string,
    limit: number = 20,
    search?: string,
    sortBy: string = 'createdAt',
    sortDir: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{ data: FriendQueryResult[]; hasNextPage: boolean; nextCursor?: string }> {
    const queryBuilder = this.createQueryBuilder("relationship")
      .leftJoin("users", "friend", "friend.email = relationship.friendEmail")
      .select([
        "relationship.id as relationship_id",
        "relationship.userEmail as relationship_useremail", 
        "relationship.friendEmail as relationship_friendemail",
        "relationship.status as relationship_status",
        "relationship.initiatedBy as relationship_initiatedby",
        "relationship.message as relationship_message", 
        "relationship.createdAt as relationship_createdat",
        "relationship.acceptedAt as relationship_acceptedat",
        "friend.id as friend_id",
        "friend.name as friend_name",
        "friend.username as friend_username",
        "friend.avatar as friend_avatar"
      ])
      .where("relationship.userEmail = :userEmail AND relationship.status = :status", {
        userEmail,
        status: RelationshipStatus.ACCEPTED,
      });

    // Add search condition
    if (search) {
      queryBuilder.andWhere(
        "(relationship.friendEmail ILIKE :search OR friend.name ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Add cursor condition
    if (cursor) {
      const operator = sortDir === 'DESC' ? '<' : '>';
      const cursorField = this.getCursorField(sortBy);
      
      if (sortBy === 'name') {
        queryBuilder.andWhere(`friend.name ${operator} :cursor`, { cursor });
      } else {
        queryBuilder.andWhere(`relationship.${cursorField} ${operator} :cursor`, { cursor });
      }
    }

    // Add ordering
    const orderField = sortBy === 'name' ? 'friend.name' : `relationship.${this.getCursorField(sortBy)}`;
    queryBuilder.orderBy(orderField, sortDir);

    // Get one extra item to check if there's a next page
    const items = await queryBuilder.limit(limit + 1).getRawMany<FriendQueryResult>();

    const hasNextPage = items.length > limit;
    if (hasNextPage) {
      items.pop(); // Remove the extra item
    }

    // Generate next cursor
    let nextCursor: string | undefined;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      if (sortBy === 'name') {
        nextCursor = lastItem.friend_name;
      } else if (sortBy === 'createdAt') {
        nextCursor = lastItem.relationship_createdat?.toISOString();
      } else if (sortBy === 'acceptedAt') {
        nextCursor = lastItem.relationship_acceptedat?.toISOString();
      }
    }

    return { data: items, hasNextPage, nextCursor };
  }

  /**
   * ✅ CURSOR PAGINATION: Get friend requests with cursor-based pagination
   */
  async findFriendRequestsWithCursor(
    userEmail: string,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortDir: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{ data: FriendQueryResult[]; hasNextPage: boolean; nextCursor?: string }> {
    const queryBuilder = this.createQueryBuilder("relationship")
      .leftJoin("users", "sender", "sender.email = relationship.userEmail")
      .select([
        "relationship.id as relationship_id",
        "relationship.userEmail as relationship_useremail",
        "relationship.message as relationship_message", 
        "relationship.createdAt as relationship_createdat",
        "sender.id as friend_id",
        "sender.name as friend_name",
        "sender.username as friend_username",
        "sender.avatar as friend_avatar"
      ])
      .where("relationship.friendEmail = :userEmail AND relationship.status = :status", {
        userEmail,
        status: RelationshipStatus.PENDING,
      });

    // Add cursor condition
    if (cursor) {
      const operator = sortDir === 'DESC' ? '<' : '>';
      
      if (sortBy === 'name') {
        queryBuilder.andWhere(`sender.name ${operator} :cursor`, { cursor });
      } else {
        queryBuilder.andWhere(`relationship.createdAt ${operator} :cursor`, { cursor });
      }
    }

    // Add ordering
    const orderField = sortBy === 'name' ? 'sender.name' : 'relationship.createdAt';
    queryBuilder.orderBy(orderField, sortDir);

    // Get one extra item to check if there's a next page
    const items = await queryBuilder.limit(limit + 1).getRawMany<FriendQueryResult>();

    const hasNextPage = items.length > limit;
    if (hasNextPage) {
      items.pop();
    }

    // Generate next cursor
    let nextCursor: string | undefined;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      if (sortBy === 'name') {
        nextCursor = lastItem.friend_name;
      } else {
        nextCursor = lastItem.relationship_createdat?.toISOString();
      }
    }

    return { data: items, hasNextPage, nextCursor };
  }

  // Private helper methods
  private createCountQuery(userEmail: string, search?: string): SelectQueryBuilder<Relationship> {
    const countQuery = this.createQueryBuilder("relationship")
      .leftJoin("users", "friend", "friend.email = relationship.friendEmail")
      .where("relationship.userEmail = :userEmail AND relationship.status = :status", {
        userEmail,
        status: RelationshipStatus.ACCEPTED,
      });

    if (search) {
      countQuery.andWhere(
        "(relationship.friendEmail ILIKE :search OR friend.name ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    return countQuery;
  }

  private getCursorField(sortBy: string): string {
    switch (sortBy) {
      case 'acceptedAt':
        return 'acceptedAt';
      case 'createdAt':
      default:
        return 'createdAt';
    }
  }
}