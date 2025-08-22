import {PassportStrategy} from "@nestjs/passport";
import {Strategy} from "passport-custom";
import {Injectable, Logger, UnauthorizedException} from "@nestjs/common";
import axios from "axios";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

    private readonly logger = new Logger(GoogleStrategy.name);

    constructor() {
        super()
    }

    /**
     * Authenticate Google profiles and manage user authentication.
     * @param req Google User
     */
    async validate(req: any): Promise<any> {
        this.logger.log(`Received request in CustomGoogleStrategy. ${JSON.stringify(req.body)}`);
        const token = req.body?.accessToken;

        if (!token) {
            this.logger.error('Google token is missing from request body.');
            throw new UnauthorizedException("Google token is required.");
        }

        // Send token to Google for verification
        try {
            this.logger.log("Đã chạy vào đây : ")
            const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            this.logger.log(`Data call api token gg : ${JSON.stringify(response.data)}`)
            // Get user data from Google feedback
            const {email, sub: googleId, given_name: firstName, family_name: lastName, picture} = response.data;

            // Check email
            if (!email) {
                this.logger.error('Google profile missing email. Unable to authenticate user.');
                throw new UnauthorizedException("Google profile is missing an email address.");
            }

            this.logger.log(`Successfully verified Google user: ${email}`);

            //Passport will attach this user object to req.user
            return {
                email,
                googleId
            };

        } catch (error) {
            this.logger.error(`Error during Google token verification: ${error.message}`);
            throw new UnauthorizedException("Google token verification failed.");
        }
    }
}

