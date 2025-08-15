import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("MAILTRAP_HOST"),
      port: this.configService.get("MAILTRAP_PORT"),
      auth: {
        user: this.configService.get("MAILTRAP_USER"),
        pass: this.configService.get("MAILTRAP_PASS"),
      },
    });
  }

  /**
   * Send an email
   * @param to Recipient email address
   * @param subject Email subject
   * @param html Email content in HTML format
   * @returns Information about the sent email
   */
  async sendMail(to: string, subject: string, html: string): Promise<any> {
    const mailOptions = {
      from: this.configService.get("MAIL_FROM", "noreply@example.com"),
      to,
      subject,
      html,
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send OTP verification email
   * @param to Recipient email address
   * @param otp One-time password
   * @returns Information about the sent email
   */
  async sendOtpEmail(to: string, otp: string): Promise<any> {
    const subject = "Email Verification Code";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
          <strong>${otp}</strong>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Send password reset OTP email
   * @param to Recipient email address
   * @param otp One-time password
   * @returns Information about the sent email
   */
  async sendPasswordResetOtpEmail(to: string, otp: string): Promise<any> {
    const subject = "Password Reset Code";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Please use the following code to verify your identity:</p>
        <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
          <strong>${otp}</strong>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request to reset your password, please ignore this email and ensure your account is secure.</p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Send find username OTP email
   * @param to Recipient email address
   * @param otp One-time password
   * @returns Information about the sent email
   */
  async sendFindUsernameOtpEmail(to: string, otp: string): Promise<any> {
    const subject = "Find Your Username Code";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Find Your Username</h2>
        <p>You requested to find your username. Please use the following code to verify your identity:</p>
        <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
          <strong>${otp}</strong>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request to find your username, please ignore this email.</p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }
}
