import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TreksModule } from './modules/treks/treks.module';
import { TrailsModule } from './modules/trails/trails.module';
import { PingsModule } from './modules/pings/pings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DatabaseModule } from './database/database.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting: 100 requests per 60 seconds globally.
    // The SOS endpoint overrides this with a more permissive limit in its own guard.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TreksModule,
    TrailsModule,
    PingsModule,
    NotificationsModule,
  ],
  providers: [
    // RolesGuard is registered globally — any controller can use @Roles() without
    // importing the guard explicitly. It is a no-op when @Roles() is not present.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
