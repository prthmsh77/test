import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../src/modules/users/users.service';
import { DB_POOL } from '../src/database/database.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPool = { query: jest.fn() };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DB_POOL, useValue: mockPool }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 'uuid', name: 'Aarti' }] });
      const user = await service.findById('uuid');
      expect(user.name).toBe('Aarti');
    });

    it('throws NotFoundException when user missing', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      await expect(service.findById('bad-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addEmergencyContact', () => {
    it('enforces max 5 contacts for free users', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '5' }] });

      await expect(
        service.addEmergencyContact(
          'user-id',
          false, // not Pro
          { name: 'Mom', phone: '+919876543210', relation: 'Mother' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows up to 10 contacts for Pro users', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '7' }] }) // current count = 7 (under 10)
        .mockResolvedValueOnce({ rows: [{ id: 'new-contact', name: 'Dad' }] }); // INSERT

      const result = await service.addEmergencyContact(
        'user-id',
        true, // Pro user
        { name: 'Dad', phone: '+919876543211', relation: 'Father' },
      );
      expect(result.name).toBe('Dad');
    });

    it('enforces max 10 contacts even for Pro users', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '10' }] });

      await expect(
        service.addEmergencyContact('user-id', true, {
          name: 'Friend',
          phone: '+919876543212',
          relation: 'Friend',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
