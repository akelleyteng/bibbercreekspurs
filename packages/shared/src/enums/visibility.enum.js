"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionType = exports.RegistrationStatus = exports.EventStatus = exports.Visibility = void 0;
var Visibility;
(function (Visibility) {
    Visibility["PUBLIC"] = "PUBLIC";
    Visibility["MEMBER_ONLY"] = "MEMBER_ONLY";
})(Visibility || (exports.Visibility = Visibility = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["UPCOMING"] = "UPCOMING";
    EventStatus["ONGOING"] = "ONGOING";
    EventStatus["COMPLETED"] = "COMPLETED";
    EventStatus["CANCELLED"] = "CANCELLED";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["REGISTERED"] = "REGISTERED";
    RegistrationStatus["WAITLISTED"] = "WAITLISTED";
    RegistrationStatus["CANCELLED"] = "CANCELLED";
})(RegistrationStatus || (exports.RegistrationStatus = RegistrationStatus = {}));
var ReactionType;
(function (ReactionType) {
    ReactionType["LIKE"] = "LIKE";
    ReactionType["HEART"] = "HEART";
    ReactionType["CELEBRATE"] = "CELEBRATE";
    ReactionType["SUPPORT"] = "SUPPORT";
})(ReactionType || (exports.ReactionType = ReactionType = {}));
//# sourceMappingURL=visibility.enum.js.map