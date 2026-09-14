import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma.module';
import { AuthService } from './auth.service';
import { FreelancersService } from './freelancers.service';
import { JobsService } from './jobs.service';
import { RequestsService } from './requests.service';
import { SocketRegistry } from './socket.registry';
import { ApiGateway } from './api.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'codespan-dev-secret-change-in-prod',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    AuthService,
    FreelancersService,
    JobsService,
    RequestsService,
    SocketRegistry,
    ApiGateway,
  ],
})
export class AppModule {}