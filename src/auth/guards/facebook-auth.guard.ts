import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that uses the custom Facebook strategy for authentication
 */
@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  // The FacebookStrategy will be used automatically because of the 'facebook' strategy name
}