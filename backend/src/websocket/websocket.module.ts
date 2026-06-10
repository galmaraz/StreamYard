import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';

import { ChatModule } from '../chat/chat.module';
import { ParticipantsModule } from '../participants/participants.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    ParticipantsModule,
    ChatModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  providers: [RealtimeGateway],
})
export class WebsocketModule {}
