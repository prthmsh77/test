import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request a 6-digit OTP via SMS to the given Indian phone number' })
  // Strict rate limit on OTP requests to prevent SMS spam / billing abuse.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<void> {
    await this.otpService.sendOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and receive JWT access + refresh tokens' })
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.phone, dto.otp);
    const tokens = await this.authService.loginOrRegister(dto.phone);
    return tokens;
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access + refresh token pair' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the provided refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.revokeRefreshToken(dto.refreshToken);
  }
}
