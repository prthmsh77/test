/**
 * PingsService unit tests — idempotency, batch validation, off-route integration.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PingsService } from '../src/modules/pings/pings.service';
import { TreksService } from '../src/modules/treks/treks.service';
import { DB_POOL } from '../src/database/database.module';
import { ForbiddenException } from '@nestjs/common';

const mockPool = { query: jest.fn() };
const mockTreksService = {
  checkOffRoute: jest.fn().mockResolvedValue(false),
  getAltitudeAlert: jest.fn().mockReturnValue(null),
};

jest.mock('@temporalio/client', () => ({
  Connection: { connect: jest.fn().mockRejectedValue(new Error('no temporal')) },
  Client: jest.fn(),
}));

const BASE_PING = {
  trekId: 'trek-uuid',
  recordedAt: '2026-05-10T08:00:00Z',
  lat: 32.2432,
  lng: 77.1956,
  altitudeMeters: 3200,
  isOfflineBuffered: false,
};

describe('PingsService', () => {
  let service: PingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PingsService,
        { provide: DB_POOL, useValue: mockPool },
        { provide: TreksService, useValue: mockTreksService },
      ],
    }).compile();

    service = module.get<PingsService>(PingsService);
    jest.clearAllMocks();
  });

  it('returns 0 accepted for an empty batch', async () => {
    const result = await service.ingestBatch('user-uuid', []);
    expect(result.accepted).toBe(0);
  });

  it('throws ForbiddenException for batch > 100 pings', async () => {
    const pings = Array.from({ length: 101 }, (_, i) => ({
      ...BASE_PING,
      recordedAt: `2026-05-10T${String(i).padStart(2, '0')}:00:00Z`,
    }));

    await expect(service.ingestBatch('user-uuid', pings)).rejects.toThrow(ForbiddenException);
  });

  it('skips pings for treks not owned by the user', async () => {
    // Query returns empty rows — no active trek owned by this user.
    mockPool.query.mockResolvedValue({ rows: [] });

    const result = await service.ingestBatch('user-uuid', [BASE_PING]);
    expect(result.accepted).toBe(0);
  });

  it('accepts valid pings and calls INSERT', async () => {
    // First query: verify trek ownership
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'trek-uuid' }] })
      // Second query: INSERT ping
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.ingestBatch('user-uuid', [BASE_PING]);
    expect(result.accepted).toBe(1);
  });

  it('detects off-route condition via TreksService', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'trek-uuid' }] })
      .mockResolvedValueOnce({ rows: [] });

    mockTreksService.checkOffRoute.mockResolvedValueOnce(true);

    const result = await service.ingestBatch('user-uuid', [BASE_PING]);
    expect(result.offRoute).toBe(true);
  });

  it('returns altitude alert when crossing threshold', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'trek-uuid' }] })
      .mockResolvedValueOnce({ rows: [] });

    mockTreksService.getAltitudeAlert.mockReturnValueOnce("You've crossed 3500m. Review the AMS symptom checklist.");

    const result = await service.ingestBatch('user-uuid', [{ ...BASE_PING, altitudeMeters: 3600 }]);
    expect(result.altitudeAlert).toContain('3500m');
  });
});
