import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

/**
 * Custom Facebook authentication strategy that directly uses the Facebook Graph API
 * instead of relying on the passport-facebook-token library.
 * 
 * This strategy validates a Facebook access token by making a request to the Facebook Graph API
 * and returns the user's email and Facebook ID if successful.
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, "facebook") {
  constructor(
    private configService: ConfigService
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

    try {
      // Make a request to the Facebook Graph API to validate the token and get user information
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=email,id&access_token=${token}`
      );

      const { email, id } = response.data;

      if (!email) {
        throw new UnauthorizedException(
          "Facebook authentication failed: No email provided"
        );
      }

      return {
        email,
        facebookId: id,
      };
    } catch (error) {
      // If the token is invalid or expired, Facebook will return an error
      throw new UnauthorizedException("Invalid Facebook token");
    }
  }
}
