/**
 * Auth unit tests.
 * Uses mock DB pool — no real Postgres connection required.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { OtpService } from '../src/modules/auth/otp.service';
import { DB_POOL } from '../src/database/database.module';

const mockPool = {
  query: jest.fn(),
};

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: DB_POOL, useValue: mockPool },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    jest.clearAllMocks();
  });

  it('should send OTP and write hashed record to DB', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    // No MSG91 key in test env → uses console log path (no HTTP call)
    delete process.env.MSG91_API_KEY;

    await expect(service.sendOtp('+919876543210')).resolves.toBeUndefined();
    // First query: invalidate old OTPs. Second: insert new OTP.
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('should throw BadRequestException for invalid OTP', async () => {
    mockPool.query.mockResolvedValue({ rows: [] }); // no matching OTP row

    await expect(service.verifyOtp('+919876543210', '000000')).rejects.toThrow(
      'Invalid OTP',
    );
  });

  it('should throw when OTP has too many attempts', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'uuid', attempts: 3, expires_at: new Date(Date.now() + 60_000) }],
    });

    await expect(service.verifyOtp('+919876543210', '123456')).rejects.toThrow(
      'Too many incorrect attempts',
    );
  });

  it('should throw when OTP is expired', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'uuid', attempts: 0, expires_at: new Date(Date.now() - 1) }],
    });

    await expect(service.verifyOtp('+919876543210', '123456')).rejects.toThrow(
      'OTP expired',
    );
  });
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '15m' } })],
      providers: [
        AuthService,
        { provide: DB_POOL, useValue: mockPool },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('creates new user on first login and returns tokens', async () => {
    // First call: findUserByPhone → no rows (new user)
    // Second call: INSERT new user
    // Third call: INSERT refresh token
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({ rows: [{ id: 'user-uuid', role: 'USER' }] }) // INSERT user
      .mockResolvedValueOnce({ rows: [] }); // INSERT refresh token

    const tokens = await service.loginOrRegister('+919876543210');
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.expiresIn).toBe(900); // 15 min
  });

  it('returns tokens for existing user without creating new row', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'existing-uuid', phone: '+919876543210', role: 'USER' }] })
      .mockResolvedValueOnce({ rows: [] }); // INSERT refresh token

    const tokens = await service.loginOrRegister('+919876543210');
    expect(tokens.accessToken).toBeTruthy();
    // INSERT was only called once (refresh token, not user)
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });
});
