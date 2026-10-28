// The framework-free half of the Vue modules: what an app can use without loading Vue. The `vue/*` entries re-export
// these unchanged, so a Vue app keeps importing them from where it always has.

// entities: the client-side model and the HTTP service an Entities API is reached through
export * from "./entities/abstractions"
export * from "./entities/config"
export * from "./entities/navigation"
export * from "./entities/utilities"

// http: the shared axios instance and the query-string encoding
export * from "./http"

// ioc: the service container
export { default as defaultServiceProvider, ServiceProvider, get, type IServiceProvider } from "./ioc/ServiceProvider"

// formatters
export * from "./formatters"

// auth: the service, the token stores, and the app's credential endpoints for the masking of failed requests
export {
    AuthService,
    type IAuthOptions,
    type IAuthenticateInput,
    type IChangePasswordInput,
    type IForgotPasswordInput,
    type IResetPasswordInput,
} from "./auth/auth-service"
export { type ITokenManager, CookieTokenManager, MemoryTokenManager, LocalStorageTokenManager } from "./auth/token-manager"
export { registerCredentialUrls } from "./auth/error-logging"

// lang
export { translate, translateMessage, type ITranslationMessages, type ITranslationMessage } from "./lang/translate"
export { formatText, type IFormatInput, type FormatTextOptions } from "./lang/formatText"

// feedback: what a failed request tells the user
export { toFeedbackError, fieldMessages, fieldLabel, setErrorTranslator, type ErrorTranslator, type FeedbackError } from "./feedback/errors"
