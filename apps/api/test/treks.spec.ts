/**
 * TreksService unit tests.
 * All DB and Temporal calls are mocked — no real connections needed.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TreksService } from '../src/modules/treks/treks.service';
import { DB_POOL } from '../src/database/database.module';
import {
  BadRequestException, ConflictException, ForbiddenException, NotFoundException,
} from '@nestjs/common';

// Minimal mock: each test overrides query as needed.
const mockPool = { query: jest.fn() };

// Silence Temporal connection attempts in unit tests.
jest.mock('@temporalio/client', () => ({
  Connection: { connect: jest.fn().mockRejectedValue(new Error('no temporal in tests')) },
  Client: jest.fn(),
}));

describe('TreksService', () => {
  let service: TreksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TreksService, { provide: DB_POOL, useValue: mockPool }],
    }).compile();

    service = module.get<TreksService>(TreksService);
    jest.clearAllMocks();
  });

  // ─── createTrek ────────────────────────────────────────────────────────────

  it('throws when planned_end is before planned_start', async () => {
    await expect(
      service.createTrek('user-uuid', {
        plannedStartAt: '2026-06-10T10:00:00Z',
        plannedEndAt: '2026-06-10T08:00:00Z', // before start
        contactIds: ['c1'],
        erss112Consent: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when planned_start is in the past', async () => {
    await expect(
      service.createTrek('user-uuid', {
        plannedStartAt: '2020-01-01T00:00:00Z',
        plannedEndAt: '2020-01-01T12:00:00Z',
        contactIds: ['c1'],
        erss112Consent: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when no confirmed emergency contact matches', async () => {
    mockPool.query.mockResolvedValue({ rows: [] }); // no confirmed contacts

    await expect(
      service.createTrek('user-uuid', {
        plannedStartAt: new Date(Date.now() + 3_600_000).toISOString(),
        plannedEndAt: new Date(Date.now() + 7_200_000).toISOString(),
        contactIds: ['contact-uuid'],
        erss112Consent: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─── startTrek ─────────────────────────────────────────────────────────────

  it('throws ConflictException when trek is already ACTIVE', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'trek-uuid', status: 'ACTIVE', planned_end_at: '2026-06-10T18:00:00Z', erss_112_consent: false }],
    });

    await expect(service.startTrek('user-uuid', 'trek-uuid')).rejects.toThrow(ConflictException);
  });

  // ─── endTrek ───────────────────────────────────────────────────────────────

  it('throws ConflictException when trek is already COMPLETED', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'trek-uuid', status: 'COMPLETED' }],
    });

    await expect(service.endTrek('user-uuid', 'trek-uuid', '123456')).rejects.toThrow(ConflictException);
  });

  it('throws ForbiddenException on wrong PIN when PIN is set', async () => {
    const { createHash } = require('crypto');
    const correctPinHash = createHash('sha256').update('999999').digest('hex');

    // First query: findById
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'trek-uuid', status: 'ACTIVE', user_name: 'Aarti' }] })
      // Second query: SELECT trek_pin_hash
      .mockResolvedValueOnce({ rows: [{ trek_pin_hash: correctPinHash, duress_pin_hash: null }] });

    await expect(service.endTrek('user-uuid', 'trek-uuid', '000000')).rejects.toThrow(ForbiddenException);
  });

  // ─── extendTrek ────────────────────────────────────────────────────────────

  it('throws BadRequestException when new end time is in the past', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'trek-uuid', status: 'ACTIVE' }],
    });

    await expect(
      service.extendTrek('user-uuid', 'trek-uuid', '2020-01-01T00:00:00Z'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when extending a non-ACTIVE trek', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'trek-uuid', status: 'COMPLETED' }],
    });

    await expect(
      service.extendTrek('user-uuid', 'trek-uuid', new Date(Date.now() + 3_600_000).toISOString()),
    ).rejects.toThrow(ConflictException);
  });

  // ─── triggerSos ────────────────────────────────────────────────────────────

  it('throws ConflictException when SOS on non-ACTIVE trek', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'trek-uuid', status: 'COMPLETED' }],
    });

    await expect(
      service.triggerSos('user-uuid', { trekId: 'trek-uuid', mode: 'CRITICAL' as any }),
    ).rejects.toThrow(ConflictException);
  });

  // ─── checkOffRoute ─────────────────────────────────────────────────────────

  it('returns false when trek has no declared route', async () => {
    mockPool.query.mockResolvedValue({ rows: [] }); // no route row
    const result = await service.checkOffRoute('trek-uuid', 32.24, 77.19);
    expect(result).toBe(false);
  });

  it('returns false when trekker is within 150m of route', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ distance_m: 80 }] }); // 80m — within threshold
    expect(await service.checkOffRoute('trek-uuid', 32.24, 77.19)).toBe(false);
  });

  it('returns true when trekker is >150m from route', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ distance_m: 200 }] }); // 200m — off route
    expect(await service.checkOffRoute('trek-uuid', 32.24, 77.19)).toBe(true);
  });

  // ─── getAltitudeAlert ──────────────────────────────────────────────────────

  it('returns AMS alert when crossing 2400m threshold', () => {
    const alert = service.getAltitudeAlert(2450, 2300);
    expect(alert).toContain('2400m');
  });

  it('returns AMS alert when crossing 3500m threshold', () => {
    const alert = service.getAltitudeAlert(3600, 3400);
    expect(alert).toContain('3500m');
  });

  it('returns null when no threshold is crossed', () => {
    const alert = service.getAltitudeAlert(2600, 2500);
    expect(alert).toBeNull();
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  it('throws NotFoundException for non-existent trek', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    await expect(service.findById('bad-uuid', 'user-uuid')).rejects.toThrow(NotFoundException);
  });
});
