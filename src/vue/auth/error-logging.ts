/**
 * Masking for everything this module writes to the console. Console output is captured verbatim by
 * breadcrumb and session-replay telemetry, and every credential the module handles rides an axios error:
 * the bearer token on `config.headers.Authorization`, the password and the reset token in `config.data`,
 * and a refresh token in the query string of `config.url`. None of them may reach a log — so nothing here
 * ever logs a raw error or a raw request config, and `maskAxiosError` is what every `catch` in the module
 * hands to `console`. Nothing is mutated: the caller's error keeps its real fields for a retry to reuse.
 */

/**
 * A login endpoint that is not `auth` (`IAuthOptions.loginUrl`) still posts the password, and the masking
 * runs far from the options object — `createAuth` registers the configured URL here so every log site
 * masks it without threading options through. Module-level like `auth` itself; there is one auth setup.
 */
let configuredLoginUrl: string | undefined
export function registerLoginUrl(url?: string) {
    configuredLoginUrl = url
}

const trimSlashes = (url: string) => url.replace(/^\/+|\/+$/g, "")
const pathOf = (url: string) => trimSlashes(url.split("?")[0]!).toLowerCase()

/**
 * The endpoints that carry a credential: the `auth` family wherever a `baseURL` puts it (`auth`,
 * `auth/password`, `auth/password/reset`, `auth/refresh`, …) plus a configured `loginUrl` that lives
 * somewhere else entirely. `oauth/token` and `api/authors` are deliberately not matched.
 */
export function isAuthUrl(url?: string) {
    if (url == null) return false
    const path = pathOf(url)
    if (/(^|\/)auth(\/|$)/.test(path)) return true
    const login = configuredLoginUrl ? pathOf(configuredLoginUrl) : ""
    return !!login && (path === login || path.endsWith(`/${login}`))
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
    if (isAuthUrl(config.url)) {
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
