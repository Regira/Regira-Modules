type IClaimValue = string | Array<string>

// Role claims arrive under one of three spellings depending on the issuer: "role" (self-issued JWT),
// "roles" (Entra) or the ClaimTypes.Role URI (ASP.NET Identity's default, API keys) — mirrors the
// backend's FindRoles() / ClaimNormalizationOptions.RoleClaimTypes.
const ROLE_CLAIM_TYPES = ["role", "roles", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]

export interface IAuthData {
    isAuthenticated: boolean
    expires: number
    /**
     * The raw JWT this data was decoded from — the identity signal `onAuthenticated()` watches. It changes
     * on sign-in and on every refresh (a tenant switch included), and stays equal when the plugin
     * re-validates the same token, which is what keeps a periodic check from re-running your handler.
     */
    readonly token?: string
    userId?: string
    name?: string
    email?: string
    displayName?: string
    culture?: string
    role?: string

    get(claimType: string): IClaimValue | undefined
    hasClaim(claimType: string, claimValue?: string): boolean
    hasPermission(value: string): boolean
    hasRole(role: string): boolean
}

export class AuthData implements IAuthData {
    private _decodedToken: Record<string, any> // decoded JWT claim bag (mixed value types: string, number, string[])
    readonly token?: string
    isAuthenticated: boolean
    expires: number
    userId?: string
    name?: string
    email?: string
    displayName?: string
    culture?: string
    role?: string | undefined

    constructor(token?: string, options: { isAuthenticated: boolean } = { isAuthenticated: false }) {
        this._decodedToken = token != null ? JSON.parse(window.atob(token.split(".")[1]!)) : {}
        this.token = token
        this.isAuthenticated = options.isAuthenticated
        this.expires = (this._decodedToken.exp ?? 0) - (this._decodedToken.nbf ?? 0)
        this.userId = this.get("sub") as string
        this.name = this.get("name") as string
        this.email = this.get("email") as string
        this.displayName = (this.get("displayName") ?? this.get("display_name")) as string
        this.culture = this.get("culture") as string
        // first role found, for display — use hasRole() for checks; a multi-role user has more
        const roleClaim = ROLE_CLAIM_TYPES.map((t) => this.get(t)).find((v) => typeof v !== "undefined")
        this.role = Array.isArray(roleClaim) ? roleClaim[0] : roleClaim
    }

    get(claimType: string): IClaimValue | undefined {
        return this._decodedToken[claimType]
    }
    hasClaim(type: string, value?: string): boolean {
        const claimValue = this.get(type)
        return typeof claimValue !== "undefined" && (value == null || (Array.isArray(claimValue) ? claimValue.includes(value!) : claimValue == value))
    }
    hasPermission(value: string): boolean {
        return this.hasClaim("permissions", value)
    }
    hasRole(role: string): boolean {
        return ROLE_CLAIM_TYPES.some((t) => this.hasClaim(t, role))
    }
}

export default AuthData
