import {Injectable, Logger, UnauthorizedException} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {Strategy} from 'passport-custom';
import appleSignin from 'apple-signin-auth';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, "apple") {

    private readonly logger = new Logger(AppleStrategy.name)

    constructor() {
        super();
    }

    /**
     * Authenticate Apple profiles and manage user authentication.
     * @param req Apple User
     */
    async validate(req: any): Promise<any> {
        const token = req.body?.id_token;

        if (!token) {
            this.logger.error('Apple ID token is missing from request body.');
            throw new UnauthorizedException("Apple ID token is required.");
        }

        // Send token to Apple for verification
        try {
            const response = await appleSignin.verifyIdToken(token);

            // Get  user data from Apple
            const {sub: appleId, email} = response;

            // Check email
            if (!email) {
                this.logger.error('Apple profile missing email. Unable to authenticate user.');
                throw new UnauthorizedException("Apple profile is missing an email address.");
            }


            //Passport will attach this user object to req.user
            return {
                email,
                appleId,
            };

        } catch (error) {
            this.logger.error(`Error during Apple token verification: ${error.message}`);
            throw new UnauthorizedException("Apple token verification failed.");
        }
    }

}
