export declare enum Role {
    MEMBER = "MEMBER",
    OFFICER = "OFFICER",
    ADMIN = "ADMIN"
}
export declare const ROLE_HIERARCHY: {
    MEMBER: number;
    OFFICER: number;
    ADMIN: number;
};
export declare function hasMinimumRole(userRole: Role, requiredRole: Role): boolean;
//# sourceMappingURL=roles.enum.d.ts.map