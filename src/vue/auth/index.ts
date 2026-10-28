import { type IAuthData } from "../../core/auth/AuthData"

export {
    AuthService,
    type IAuthenticateInput,
    type IChangePasswordInput,
    type IForgotPasswordInput,
    type IResetPasswordInput,
} from "../../core/auth/auth-service"
export { default as routeGuard, routeAllows } from "./route-guard"
export { type ITokenManager, CookieTokenManager, MemoryTokenManager, LocalStorageTokenManager } from "../../core/auth/token-manager"

export { useAuth, useGlobalAuth, getAccountName, type IAuth, type IGlobalAuth, type GlobalAuth, type IAuthOptions } from "./auth"
export { registerCredentialUrls } from "../../core/auth/error-logging"
export { useAuthStore, createStore, type IDefineAuthStore, type IAuthStore } from "./store"
export { onAuthenticated, type OnAuthenticatedOptions } from "./onAuthenticated"
export { default as plugin } from "./plugin"
export {
    useLoginForm,
    type LoginFormEmits,
    type LoginFormProps,
    type LoginFormLabels,
    type LoginModalEmits,
    type LoginModalProps,
    type LoginModalSlots,
    type LoginInput,
} from "./useLoginForm"
export {
    useForgotPasswordForm,
    type ForgotPasswordFormEmits,
    type ForgotPasswordFormProps,
    type ForgotPasswordModalEmits,
    type ForgotPasswordModalProps,
    type ForgotPasswordModalSlots,
} from "./useForgotPasswordForm"
export {
    useChangePasswordForm,
    type ChangePasswordFormEmits,
    type ChangePasswordFormProps,
    type ChangePasswordFormLabels,
} from "./useChangePasswordForm"
export { useResetPasswordForm, type ResetPasswordFormProps, type ResetPasswordFormEmits, type ResetPasswordFormLabels } from "./useResetPasswordForm"
export type { LogoutFormProps } from "./logout-form"

export { default as LoginForm } from "./LoginForm.vue"
export { default as LogoutForm } from "./LogoutForm.vue"
export { default as LoginModal } from "./LoginModal.vue"
export { default as ForgotPasswordModal } from "./ForgotPasswordModal.vue"
export { default as ChangePasswordForm } from "./ChangePasswordForm.vue"
export { default as ResetPasswordForm } from "./ResetPasswordForm.vue"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $auth: import("./auth").IGlobalAuth | { enabled: false; authData?: IAuthData }
    }
}
