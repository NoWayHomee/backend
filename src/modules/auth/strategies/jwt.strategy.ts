import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { user_type_enum } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../auth.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: user_type_enum;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      userType: payload.userType,
    };
  }
}
