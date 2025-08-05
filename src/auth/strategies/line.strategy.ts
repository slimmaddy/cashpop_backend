import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import axios from "axios";

@Injectable()
export class LineStrategy extends PassportStrategy(
  Strategy, "line"
) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super();

    // Log a warning if credentials are missing
    if (!configService.get("LINE_CHANNEL_ID") || !configService.get("LINE_CHANNEL_SECRET")) {
      console.warn('Line authentication is disabled due to missing credentials');
    }
  }

  /**
   * Validate a Line access token by making a request to the Line API
   * @param request The request object containing the Line access token
   * @returns The user's email and Line ID if successful
   */
  async validate(request: any): Promise<any> {
    const token = request.body?.token;

    if (!token) {
      throw new UnauthorizedException("Line token is required");
    }

    try {
      console.log('🔍 Validating Line token in strategy...');
      
      // First, get basic profile information
      const profileResponse = await axios.get(
        `https://api.line.me/v2/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const { userId, displayName } = profileResponse.data;
      
      if (!userId) {
        throw new UnauthorizedException(
          "Line authentication failed: No user ID provided"
        );
      }

      // Try to get email from OpenID Connect endpoint (requires 'email' scope)
      let email = null;
      try {
        const openIdResponse = await axios.get(
          `https://api.line.me/oauth2/v2.1/userinfo`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        email = openIdResponse.data.email;
        console.log('� Email retrieved from LINE OpenID:', email || 'No email provided');
      } catch (openIdError) {
        console.log('⚠️ Could not retrieve email from LINE OpenID (may not have email scope)');
      }

      // Require email for LINE authentication
      if (!email) {
        throw new UnauthorizedException(
          "LINE authentication failed: Email is required. Please ensure your LINE account has an email address and grant email permission."
        );
      }

      console.log('✅ Line token validated successfully in strategy');
      console.log('📋 User info:', { userId, displayName, email });

      return {
        email: email,
        lineId: userId,
        name: displayName || `LineUser_${userId.substring(0, 8)}`,
      };
    } catch (error) {
      console.log('❌ Line token validation failed in strategy');
      
      if (error.response?.data?.error) {
        const lineError = error.response.data.error;
        console.log('🚨 Line API Error:', {
          message: lineError.message,
          error: lineError.error,
          error_description: lineError.error_description
        });
        
        // Handle specific Line error codes
        switch (lineError.error) {
          case 'invalid_token':
            throw new UnauthorizedException("Line token is invalid or expired");
          case 'insufficient_scope':
            throw new UnauthorizedException("Line token has insufficient scope");
          case 'invalid_request':
            throw new UnauthorizedException("Invalid Line API request");
          default:
            throw new UnauthorizedException(`Line API error: ${lineError.error_description || lineError.message}`);
        }
      }
      
      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new UnauthorizedException("Unable to connect to Line API");
      }
      
      // Re-throw if it's already an UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.log('🚨 Unexpected error:', error.message);
      throw new UnauthorizedException("Failed to validate Line token");
    }
  }
}
