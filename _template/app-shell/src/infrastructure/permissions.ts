// erasableSyntaxOnly-safe const maps (not enums)
// Roles match the names the API's Identity roles carry; permissions match a "permissions" claim, which a
// standard Identity backend does not mint — see user-plugin.ts.
export const Roles = { ADMIN: "Admin" } as const
export type Role = (typeof Roles)[keyof typeof Roles]

export const Permissions = { CAN_READ: "can_read", CAN_WRITE: "can_write", ADMIN: "admin" } as const
export type Permission = (typeof Permissions)[keyof typeof Permissions]
