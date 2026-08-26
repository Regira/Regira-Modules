/**
 * Masking for everything written to the console by this module — and, through the response interceptor it
 * installs, by every request the app makes on that axios instance. Console output is captured verbatim by
 * breadcrumb and session-replay telemetry, and every credential the module handles rides an axios error:
 * the bearer token on `config.headers.Authorization`, the password and the reset token in `config.data`,
 * and a refresh token in the query string of `config.url`. None of them may reach a log — so nothing here
 * ever logs a raw error or a raw request config, and `maskAxiosError` is what every `catch` in the module
 * hands to `console`. Nothing is mutated: the caller's error keeps its real fields for a retry to reuse.
 *
 * The header and axios' `auth` field are masked on *every* request. A request BODY is only dropped for the
 * endpoints known to carry a credential — the diagnostic value of a failed request's body is real, so it is
 * not thrown away everywhere. That list is what an application extends with `registerCredentialUrls` (or
 * the `credentialUrls` auth option) for its own credential-bearing endpoints; see `isCredentialUrl`.
 */

/**
 * A login endpoint that is not `auth` (`IAuthOptions.loginUrl`) still posts the password, and the masking
 * runs far from the options object — `createAuth` registers the configured URL here so every log site
 * masks it without threading options through. Module-level like `auth` itself; there is one auth setup.
 */
let loginUrlMatcher: RegExp | undefined
export function registerLoginUrl(url?: string) {
    loginUrlMatcher = url ? toMatcher(url) : undefined
}

const trimSlashes = (url: string) => url.replace(/^\/+|\/+$/g, "")
const pathOf = (url: string) => trimSlashes(url.split("?")[0]!).toLowerCase()
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * A registered path matches a request URL as a whole path or as its trailing segments, so `users/password`
 * covers both a relative `users/password` and whatever a `baseURL` prefixes it with. `*` stands for exactly
 * one segment (`users/*\/password` → `users/123/password`).
 */
function toMatcher(url: string): RegExp {
    const pattern = pathOf(url)
        .split("/")
        .map((segment) => (segment === "*" ? "[^/]+" : escapeRegex(segment)))
        .join("/")
    return new RegExp(`(^|/)${pattern}$`)
}

/**
 * Endpoints the application knows carry a credential. The interceptor is installed on the app's shared axios
 * instance, so it logs every failed request the SPA makes — but only this module's own endpoints are
 * credential-bearing by construction. An app that posts a password anywhere else (`users/*\/password`, an
 * admin "create user", an invite-accept) registers those paths so their bodies are dropped too.
 */
const credentialMatchers: Array<RegExp> = []
/**
 * Register additional credential-bearing endpoints — additive, and safe to call more than once. A `string`
 * is matched as described on {@link toMatcher} (whole path or trailing segments, `*` = one segment); a
 * `RegExp` is tested against the request path lower-cased, without its query string and outer slashes.
 *
 * Call it after the auth plugin is installed, or pass `credentialUrls` to the plugin — `createAuth` resets
 * the list to what its options carry, so a call made before the plugin installs would be dropped.
 *
 * ```ts
 * registerCredentialUrls("users/*\/password", "invitations/accept", /(^|\/)tokens\//)
 * ```
 */
export function registerCredentialUrls(...urls: Array<string | RegExp>) {
    for (const url of urls) {
        credentialMatchers.push(typeof url === "string" ? toMatcher(url) : url)
    }
}
/** internal — `createAuth` owns the option-provided list, so re-running the setup replaces rather than accumulates */
export function resetCredentialUrls() {
    credentialMatchers.length = 0
}

/**
 * The endpoints that carry a credential: the `auth` family wherever a `baseURL` puts it (`auth`,
 * `auth/password`, `auth/password/reset`, `auth/refresh`, …), a configured `loginUrl` that lives somewhere
 * else entirely, and whatever the application registered with {@link registerCredentialUrls}.
 * `oauth/token` and `api/authors` are deliberately not matched.
 */
export function isCredentialUrl(url?: string) {
    if (url == null) return false
    const path = pathOf(url)
    if (/(^|\/)auth(\/|$)/.test(path)) return true
    if (loginUrlMatcher?.test(path)) return true
    return credentialMatchers.some((matcher) => matcher.test(path))
}

type RequestConfig = { url?: string; headers?: Record<string, unknown>; data?: unknown; params?: unknown; auth?: unknown }

/** copy of a request config with the credentials masked — the original is never touched */
export function maskCredentials(config: RequestConfig | undefined) {
    if (config == null) return config
    const masked: Record<string, unknown> = { ...config }
    if (config.headers != null) {
        const headers: Record<string, unknown> = { ...config.headers }
        // header names are case-insensitive, so match on the name rather than trusting one spelling
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === "authorization") headers[key] = "<redacted>"
        }
        masked.headers = headers
    }
    // axios' own basic-auth field is a credential by definition, whatever the URL
    if (config.auth != null) masked.auth = "<redacted>"
    if (isCredentialUrl(config.url)) {
        // The auth endpoints carry the credential in the *body* (login posts { username, password };
        // changePassword and resetPassword post the password and the reset token) and in the *query*
        // (`refresh` puts its params there, a refresh token among them). Both are dropped wholesale rather
        // than field by field — the endpoint that failed and its status are the diagnostics that matter
        // here, and a key list would silently miss whatever field an API adds next.
        if (config.data !== undefined) masked.data = "<redacted>"
        if (config.params !== undefined) masked.params = "<redacted>"
        if (config.url?.includes("?")) masked.url = `${config.url.split("?")[0]}?<redacted>`
    }
    return masked
}

/**
 * The fields of a rejected request worth logging, with every credential masked. Log this instead of the
 * error itself: an axios error carries the request that produced it, credentials and all.
 */
export function maskAxiosError(ex: any) {
    return {
        message: ex?.message,
        code: ex?.code,
        status: ex?.response?.status,
        data: ex?.response?.data,
        stack: ex?.stack,
        config: maskCredentials(ex?.config),
    }
}
