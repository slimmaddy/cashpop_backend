import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import axios from "axios";

@Injectable()
export class FacebookStrategy extends PassportStrategy(
  Strategy, "facebook"
) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super();

    // Log a warning if credentials are missing
    if (!configService.get("FACEBOOK_APP_ID") || !configService.get("FACEBOOK_APP_SECRET")) {
      console.warn('Facebook authentication is disabled due to missing credentials');
    }
  }

  /**
   * Validate a Facebook access token by making a request to the Facebook Graph API
   * @param request The request object containing the Facebook access token
   * @returns The user's email and Facebook ID if successful
   */
  async validate(request: any): Promise<any> {
    const token = request.body?.token;

    if (!token) {
      throw new UnauthorizedException("Facebook token is required");
    }

    try{
      // Make a request to the Facebook Graph API to validate the token and get user information
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=email,id,name&access_token=${token}`
      );

      const { email, id, name } = response.data;
      
      console.log('✅ Facebook token validated successfully in strategy');
      console.log('📋 User info:', { id, email, name: name || 'N/A' });

      if (!email) {
        throw new UnauthorizedException(
          "Facebook authentication failed: No email provided"
        );
      }

      return {
        email,
        facebookId: id,
        name: name || email.split('@')[0], // Fallback name from email
      };
    } catch (error) { 
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        
        // Handle specific Facebook error codes
        switch (fbError.code) {
          case 190:
            throw new UnauthorizedException("Facebook token is invalid, expired, or revoked");
          case 102:
            throw new UnauthorizedException("Facebook session key is invalid");
          case 2500:
            throw new UnauthorizedException("User has not authorized the application");
          default:
            throw new UnauthorizedException(`Facebook API error: ${fbError.message}`);
        }
      }
      
      // Re-throw if it's already an UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException("Failed to validate Facebook token");
    }
  }
}
