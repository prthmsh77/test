"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationLevel = exports.SosMode = exports.TrekStatus = void 0;
var TrekStatus;
(function (TrekStatus) {
    TrekStatus["PLANNED"] = "PLANNED";
    TrekStatus["ACTIVE"] = "ACTIVE";
    TrekStatus["COMPLETED"] = "COMPLETED";
    TrekStatus["OVERDUE"] = "OVERDUE";
    TrekStatus["INCIDENT"] = "INCIDENT";
    TrekStatus["CANCELLED"] = "CANCELLED";
})(TrekStatus || (exports.TrekStatus = TrekStatus = {}));
var SosMode;
(function (SosMode) {
    SosMode["HELP"] = "HELP";
    SosMode["MEDICAL"] = "MEDICAL";
    SosMode["CRITICAL"] = "CRITICAL";
})(SosMode || (exports.SosMode = SosMode = {}));
var EscalationLevel;
(function (EscalationLevel) {
    EscalationLevel["L0"] = "L0";
    EscalationLevel["L1"] = "L1";
    EscalationLevel["L2"] = "L2";
    EscalationLevel["L3"] = "L3";
    EscalationLevel["L4"] = "L4";
    EscalationLevel["L5"] = "L5";
})(EscalationLevel || (exports.EscalationLevel = EscalationLevel = {}));
//# sourceMappingURL=trek.js.map