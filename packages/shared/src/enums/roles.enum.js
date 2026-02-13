"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_HIERARCHY = exports.Role = void 0;
exports.hasMinimumRole = hasMinimumRole;
var Role;
(function (Role) {
    Role["MEMBER"] = "MEMBER";
    Role["OFFICER"] = "OFFICER";
    Role["ADMIN"] = "ADMIN";
})(Role || (exports.Role = Role = {}));
exports.ROLE_HIERARCHY = {
    [Role.MEMBER]: 0,
    [Role.OFFICER]: 1,
    [Role.ADMIN]: 2,
};
function hasMinimumRole(userRole, requiredRole) {
    return exports.ROLE_HIERARCHY[userRole] >= exports.ROLE_HIERARCHY[requiredRole];
}
//# sourceMappingURL=roles.enum.js.map