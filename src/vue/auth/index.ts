import { type IAuthData } from "./AuthData"

export { AuthService, type IAuthenticateInput, type IChangePasswordInput, type IForgotPasswordInput, type IResetPasswordInput } from "./auth-service"
export { default as routeGuard } from "./route-guard"
export { type ITokenManager, CookieTokenManager, MemoryTokenManager, LocalStorageTokenManager } from "./token-manager"

export { useAuth, useGlobalAuth, getAccountName, type IAuth, type IGlobalAuth, type GlobalAuth } from "./auth"
export { useAuthStore, createStore, type IDefineAuthStore, type IAuthStore } from "./store"
export { default as plugin } from "./plugin"
export { useLoginForm, type LoginFormEmits, type LoginFormProps, type LoginModalProps, type LoginModalSlots, type LoginInput } from "./useLoginForm"
export {
    useForgotPasswordForm,
    type ForgotPasswordFormEmits,
    type ForgotPasswordFormProps,
    type ForgotPasswordModalProps,
    type ForgotPasswordModalSlots,
} from "./useForgotPasswordForm"
export { useChangePasswordForm, type ChangePasswordFormEmits, type ChangePasswordFormProps } from "./useChangePasswordForm"
export { useResetPasswordForm, type ResetPasswordFormProps, type ResetPasswordFormEmits } from "./useResetPasswordForm"

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
