import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContactInfo } from '../dto/syncing.dto';

@Injectable()
export class UserLookupService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Tìm CashPop users từ danh sách emails
   */
  async findCashpopUsersByEmails(emails: string[]): Promise<User[]> {
    if (emails.length === 0) return [];

    // Filter out empty emails and duplicates
    const validEmails = [...new Set(emails.filter(email => email && email.trim()))];
    
    if (validEmails.length === 0) return [];

    return this.userRepository.find({
      where: { email: In(validEmails) },
      select: ['id', 'email', 'name', 'username', 'avatar']
    });
  }

  /**
   * Tìm CashPop users từ danh sách contacts
   */
  async findCashpopUsersFromContacts(contacts: ContactInfo[]): Promise<User[]> {
    const emails = contacts
      .filter(contact => contact.email)
      .map(contact => contact.email);

    return this.findCashpopUsersByEmails(emails);
  }

  /**
   * Kiểm tra user có tồn tại theo email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    if (!email || !email.trim()) return false;

    const count = await this.userRepository.count({
      where: { email: email.trim() }
    });

    return count > 0;
  }

  /**
   * Lấy thông tin user theo email (với cache-friendly select)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email || !email.trim()) return null;

    return this.userRepository.findOne({
      where: { email: email.trim() },
      select: ['id', 'email', 'name', 'username', 'avatar']
    });
  }

  /**
   * Lấy thông tin nhiều users theo emails
   */
  async getUsersByEmails(emails: string[]): Promise<Map<string, User>> {
    const users = await this.findCashpopUsersByEmails(emails);
    const userMap = new Map<string, User>();
    
    users.forEach(user => {
      userMap.set(user.email, user);
    });

    return userMap;
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Filter contacts với valid emails
   */
  filterContactsWithValidEmails(contacts: ContactInfo[]): ContactInfo[] {
    return contacts.filter(contact => 
      contact.email && this.isValidEmail(contact.email)
    );
  }
}
