import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert, BeforeUpdate, AfterLoad,
} from "typeorm";
import { Exclude } from "class-transformer";
import * as bcrypt from "bcrypt";
import { ApiProperty } from "@nestjs/swagger";

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

  @Column({ default: false })
  @ApiProperty({ description: "Whether the user is registered via Facebook" })
  isFacebookUser: boolean;

  @Column({ nullable: true })
  @ApiProperty({
    description: "The Facebook ID of the user if registered via Facebook",
  })
  facebookId: string;

  @Column({ default: false })
  @ApiProperty({ description: "Whether the user is registered via Google" })
  isGoogleUser: boolean;

  @Column({ nullable: true })
  @ApiProperty({
    description: "The Google ID of the user if registered via Google",
  })
  googleId: string;

  @Column({ default: false })
  @ApiProperty({ description: "Whether the user is registered via Apple" })
  isAppleUser: boolean;

  @Column({ nullable: true })
  @ApiProperty({
    description: "The Apple ID of the user if registered via Apple",
  })
  appleId: string;

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
