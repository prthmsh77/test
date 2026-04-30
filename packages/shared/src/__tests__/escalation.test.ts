import { ESCALATION_OFFSETS_MS, AMS_ALTITUDE_THRESHOLDS_M, OFF_ROUTE_DEVIATION_METERS } from '../constants/escalation';

describe('Escalation constants', () => {
  it('L0 fires at planned_end (0 offset)', () => {
    expect(ESCALATION_OFFSETS_MS.L0).toBe(0);
  });

  it('L1 fires 30 minutes after planned_end', () => {
    expect(ESCALATION_OFFSETS_MS.L1).toBe(30 * 60 * 1000);
  });

  it('L4 fires 6 hours after planned_end', () => {
    expect(ESCALATION_OFFSETS_MS.L4).toBe(6 * 60 * 60 * 1000);
  });

  it('escalation levels are in ascending order', () => {
    const { L0, L1, L2, L3, L4 } = ESCALATION_OFFSETS_MS;
    expect(L0).toBeLessThan(L1);
    expect(L1).toBeLessThan(L2);
    expect(L2).toBeLessThan(L3);
    expect(L3).toBeLessThan(L4);
  });

  it('AMS thresholds match PRD §6.2 specification', () => {
    expect(AMS_ALTITUDE_THRESHOLDS_M).toEqual([2400, 3500, 4500]);
  });

  it('off-route deviation matches PRD §7.3 (150m)', () => {
    expect(OFF_ROUTE_DEVIATION_METERS).toBe(150);
  });
});
