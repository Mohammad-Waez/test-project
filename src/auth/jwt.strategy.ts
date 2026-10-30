import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import 'dotenv/config';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET')!,
      ignoreExpiration: false,
    });
  }
  async validate(payload: { sub: number; role: string; sid: number }) {
    return {
      id: payload.sub,
      role: payload.role,
      sid: payload.sid,
    };
  }
}
