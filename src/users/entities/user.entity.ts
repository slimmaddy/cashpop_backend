import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert, BeforeUpdate, AfterLoad,
  OneToMany,
} from "typeorm";
import { Exclude } from "class-transformer";
import * as bcrypt from "bcrypt";
import { ApiProperty } from "@nestjs/swagger";

export enum AuthProvider {
  LOCAL = 'local',
  FACEBOOK = 'facebook',
  LINE = 'line',
  APPLE = 'apple',
  GOOGLE = 'google'
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty({ description: "The unique identifier of the user" })
  id: string;

  @Column({ unique: true })
  @ApiProperty({ description: "The email address of the user" })
  email: string;

  @Column({ unique: true })
  @ApiProperty({ description: "The username of the user" })
  username: string;

  @Column({ nullable: false })
  @ApiProperty({ description: "The full name of the user", maxLength: 50 })
  name: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL
  })
  @ApiProperty({ 
    description: "The authentication provider used for this user",
    enum: AuthProvider,
    default: AuthProvider.LOCAL
  })
  provider: AuthProvider;

  @Column({ nullable: true })
  @ApiProperty({
    description: "The external provider ID (Facebook ID, Google ID, etc.)",
  })
  providerId: string;

  @Column({ nullable: true })
  @ApiProperty({ description: "The refresh token for JWT authentication" })
  @Exclude()
  refreshToken: string;
  
  @Column({ nullable: true })
  @ApiProperty({ description: "The timestamp when the refresh token was created" })
  @Exclude()
  refreshTokenCreatedAt: Date;
  
  @Column({ nullable: true })
  @ApiProperty({ description: "The avatar URL of the user" })
  avatar: string;
  
  @Column({ nullable: true, type: 'float' })
  @ApiProperty({ description: "The height of the user in cm" })
  height: number;
  
  @Column({ nullable: true, type: 'float' })
  @ApiProperty({ description: "The weight of the user in kg" })
  weight: number;
  
  @Column({ nullable: true })
  @ApiProperty({ description: "The sex of the user (male/female/other)" })
  sex: string;
  
  @Column({ nullable: true, type: 'date' })
  @ApiProperty({ description: "The date of birth of the user" })
  dateOfBirth: Date;
  
  @Column({ nullable: true })
  @ApiProperty({ description: "The residential area of the user" })
  residentialArea: string;

  // @Column({ nullable: true, unique: true })
  // @ApiProperty({ description: "The phone number of the user" })
  // phoneNumber: string;

  @Column({ nullable: true, unique: true })
  @ApiProperty({ description: "The invite code that can be shared with other users" })
  inviteCode: string;

  @Column({ nullable: true })
  @ApiProperty({ description: "The invite code used by this user during registration" })
  invitedCode: string;

  @CreateDateColumn()
  @ApiProperty({ description: "The date when the user was created" })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: "The date when the user was last updated" })
  updatedAt: Date;

  // Relations
  @OneToMany('Relationship', 'user')
  relationships: any[];

  // temp property to hold current value before update
  private _originalPassword: string;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    if (this.password && this.password !== this._originalPassword) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }

  // temp property to hold current value before update
  private _originalRefreshToken: string;

  @BeforeInsert()
  async hashRefreshToken() {
    if (this.refreshToken) {
      this.refreshToken = await bcrypt.hash(this.refreshToken, 10);
    }
  }

  @BeforeUpdate()
  async hashRefreshTokenOnUpdate() {
    if (this.refreshToken && this.refreshToken !== this._originalRefreshToken) {
      this.refreshToken = await bcrypt.hash(this.refreshToken, 10);
    }
  }

  /**
   * Validates a refresh token against the stored hash and checks if it has expired
   * @param refreshToken The refresh token to validate
   * @param refreshExpSec The expiration time in seconds (provided by AuthService from ConfigService)
   * @returns Object with status and isValid flag. Status can be 'valid', 'expired', or 'invalid'
   */
  async validateRefreshToken(refreshToken: string, refreshExpSec?: number): Promise<{ status: 'valid' | 'expired' | 'invalid', isValid: boolean }> {
    if (!this.refreshToken || !this.refreshTokenCreatedAt) {
      return { status: 'invalid', isValid: false };
    }
    
    // Use provided expiration time or default to 7 days (604800 seconds)
    const expirationSeconds = refreshExpSec || 604800;
    
    // Check if the refresh token has expired
    const now = new Date();
    const expirationDate = new Date(this.refreshTokenCreatedAt);
    expirationDate.setSeconds(expirationDate.getSeconds() + expirationSeconds);
    
    if (now > expirationDate) {
      // Token has expired
      return { status: 'expired', isValid: false };
    }
    
    // Token hasn't expired, validate it
    const isValid = await bcrypt.compare(refreshToken, this.refreshToken);
    return { 
      status: isValid ? 'valid' : 'invalid', 
      isValid 
    };
  }

  // Hook to capture the original value after loading
  @AfterLoad()
  private loadOriginalPasswordAndRefreshToken() {
    this._originalPassword = this.password;
    this._originalRefreshToken = this.refreshToken;
  }
}
