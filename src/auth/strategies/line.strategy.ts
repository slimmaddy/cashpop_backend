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

      // Get email from LINE - comprehensive approach
      let email = null;
      let emailSource = 'none';
      let userInfoData = null;

      console.log('🔍 Starting email retrieval process...');
      console.log('📋 Request body keys:', Object.keys(request.body || {}));

      // Method 1: OpenID Connect UserInfo endpoint (primary method)
      try {
        console.log('🔍 Method 1: Trying UserInfo endpoint...');
        console.log('🔗 URL: https://api.line.me/oauth2/v2.1/userinfo');
        console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');

        const userinfoResponse = await axios.get('https://api.line.me/oauth2/v2.1/userinfo', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000,
          validateStatus: function (status) {
            return status < 500; // Accept any status code less than 500
          }
        });

        console.log('📊 UserInfo Response Status:', userinfoResponse.status);
        console.log('📧 Full UserInfo response:', JSON.stringify(userinfoResponse.data, null, 2));

        if (userinfoResponse.status === 200) {
          userInfoData = userinfoResponse.data;
          email = userinfoResponse.data.email;

          console.log('✅ UserInfo endpoint success');

          if (email) {
            emailSource = 'UserInfo endpoint';
            console.log('🎉 Email found in UserInfo:', email);
          } else {
            console.log('⚠️ UserInfo endpoint worked but no email field');
            console.log('🔍 Available fields:', Object.keys(userinfoResponse.data));
          }
        } else {
          console.log('❌ UserInfo endpoint returned non-200 status:', userinfoResponse.status);
          console.log('📄 Response data:', userinfoResponse.data);
        }

      } catch (userinfoError) {
        console.log('❌ UserInfo endpoint failed');
        console.log('- Status:', userinfoError.response?.status);
        console.log('- Status Text:', userinfoError.response?.statusText);
        console.log('- Error Data:', JSON.stringify(userinfoError.response?.data, null, 2));
        console.log('- Error Message:', userinfoError.message);
        console.log('- Request URL:', userinfoError.config?.url);
        console.log('- Request Headers:', userinfoError.config?.headers);

        if (userinfoError.response?.status === 403) {
          console.log('💡 403 Forbidden: OpenID Connect may not be enabled in your LINE channel');
          console.log('💡 Or the token may not have the required scope');
        } else if (userinfoError.response?.status === 401) {
          console.log('💡 401 Unauthorized: Token is invalid, expired, or malformed');
        } else if (userinfoError.code === 'ECONNREFUSED') {
          console.log('💡 Connection refused: Network issue or LINE API is down');
        } else if (userinfoError.code === 'ETIMEDOUT') {
          console.log('💡 Request timeout: LINE API is slow to respond');
        }
      }

      // Method 2: Check token scope to verify email permission
      try {
        console.log('🔍 Method 2: Checking token scope...');
        const verifyResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify',
          `access_token=${token}`,
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
          }
        );

        console.log('✅ Token verification:', JSON.stringify(verifyResponse.data, null, 2));

        if (verifyResponse.data.scope && verifyResponse.data.scope.includes('email')) {
          console.log('✅ Token has email scope');
        } else {
          console.log('❌ Token missing email scope. Current scope:', verifyResponse.data.scope);
          console.log('💡 You need to re-authorize with email scope included');
        }
      } catch (verifyError) {
        console.log('⚠️ Token verification failed:', verifyError.response?.status, verifyError.response?.data || verifyError.message);
      }

      // Method 3: Direct email input (for testing)
      if (!email && request.body?.email) {
        email = request.body.email;
        emailSource = 'direct input';
        console.log('📧 Using email from direct input:', email);
      }

      // Method 4: Extract from ID token if provided
      if (!email && request.body?.id_token) {
        try {
          console.log('🔍 Method 4: Trying ID token...');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(request.body.id_token);
          console.log('🔓 ID token decoded:', JSON.stringify(decoded, null, 2));

          if (decoded?.email) {
            email = decoded.email;
            emailSource = 'ID token';
            console.log('🎉 Email found in ID token:', email);
          }
        } catch (jwtError) {
          console.log('❌ ID token decode failed:', jwtError.message);
        }
      }

      // Final summary
      console.log('� EMAIL RETRIEVAL SUMMARY:');
      console.log('='.repeat(50));
      console.log('- UserInfo data available:', !!userInfoData);
      console.log('- Email from UserInfo:', userInfoData?.email || 'none');
      console.log('- Email from direct input:', request.body?.email || 'none');
      console.log('- Email from ID token:', request.body?.id_token ? 'checking...' : 'not provided');
      console.log('- FINAL EMAIL:', email || 'NOT FOUND');
      console.log('- EMAIL SOURCE:', emailSource);
      console.log('='.repeat(50));

      // Final check
      if (!email) {
        console.log('❌ No email found from any method');
        console.log('🔧 Troubleshooting steps:');
        console.log('1. Ensure your LINE channel has OpenID Connect enabled');
        console.log('2. Make sure authorization includes "email" scope');
        console.log('3. User must have email in their LINE account');
        console.log('4. Try using ID token or direct email input for testing');

        throw new UnauthorizedException(
          "LINE authentication failed: Could not obtain email address. " +
          "Please ensure: 1) Your LINE channel has OpenID Connect enabled, " +
          "2) Authorization includes 'email' scope, " +
          "3) User has email in LINE account and granted permission."
        );
      }

      console.log(`✅ Email obtained from: ${emailSource}`);
      console.log(`📧 Final email: ${email}`);

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
