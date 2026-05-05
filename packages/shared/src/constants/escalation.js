"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOW_BATTERY_THRESHOLD_PERCENT = exports.SENTINEL_DISPATCH_RADIUS_KM = exports.OFF_ROUTE_ESCALATION_WAIT_MS = exports.OFF_ROUTE_DEVIATION_METERS = exports.AMS_ALTITUDE_THRESHOLDS_M = exports.ESCALATION_OFFSETS_MS = void 0;
exports.ESCALATION_OFFSETS_MS = {
    L0: 0,
    L1: 30 * 60 * 1000,
    L2: 2 * 60 * 60 * 1000,
    L3: 4 * 60 * 60 * 1000,
    L4: 6 * 60 * 60 * 1000,
};
exports.AMS_ALTITUDE_THRESHOLDS_M = [2400, 3500, 4500];
exports.OFF_ROUTE_DEVIATION_METERS = 150;
exports.OFF_ROUTE_ESCALATION_WAIT_MS = 10 * 60 * 1000;
exports.SENTINEL_DISPATCH_RADIUS_KM = 5;
exports.LOW_BATTERY_THRESHOLD_PERCENT = 20;
//# sourceMappingURL=escalation.js.map