// erasableSyntaxOnly-safe const map (not an enum)
export const Permissions = { CAN_READ: "can_read", CAN_WRITE: "can_write", ADMIN: "admin" } as const
export type Permission = (typeof Permissions)[keyof typeof Permissions]
export default Permissions
