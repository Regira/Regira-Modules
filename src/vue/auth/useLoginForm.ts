import { ref } from "vue"
import { useAuthStore } from "./store"
import { maskAxiosError } from "./error-logging"

export type LoginInput = { username: string; password: string }

export interface LoginFormEmits {
    (e: "forgotPassword", username?: string): void
    (e: "signingIn", username?: string): void
    (e: "success", username?: string): void
    (e: "fail", username?: string): void
}
/** the default form's events, forwarded (a slotted form emits its own), plus the modal's close: its header X or Esc */
export interface LoginModalEmits extends LoginFormEmits {
    (e: "close"): void
}
/** the texts `LoginForm` shows; each one left out stays English */
export type LoginFormLabels = {
    /** "Username" */
    username?: string
    /** "Password" */
    password?: string
    /** "Sign in" */
    signIn?: string
    /** "Signing in ..." */
    signingIn?: string
    /** "Forgot password?" */
    forgotPassword?: string
    /** "Unfortunately, signing in failed." */
    failed?: string
    /** "Try again in 5 min.", after `failed` for a locked-out account */
    lockedOut?: string
    /** "This account is not confirmed yet. Follow the link we mailed you." */
    notConfirmed?: string
}
export interface LoginFormProps {
    username?: string
    labels?: LoginFormLabels
}

export type LoginModalProps = {
    username?: string
    /** "Sign in" by default */
    title?: string
    /** handed to the default `LoginForm`; a slotted form takes its own */
    labels?: LoginFormLabels
    /** visibility is a real prop (defaults on); prefer gating the whole component with v-if —
     * it unmounts mask + dialog in one go and cannot strand a leave-transition */
    isVisible?: boolean
    /** the header's close button (X), default on; pass false while sign-in is required, where closing leads nowhere */
    showClose?: boolean
}
export type LoginModalSlots = {
    /** replace the whole login form; scoped with the initial username */
    default?(props: { username?: string }): any
}

export function useLoginForm(props: LoginFormProps, emit: LoginFormEmits) {
    const username = ref(props.username || "")
    const password = ref("")

    const failed = ref(false)
    const signingIn = ref(false)
    const isLockedOut = ref(false)
    /** the password was right but the account (or its e-mail/phone) is not confirmed yet */
    const isNotAllowed = ref(false)

    const store = useAuthStore()

    async function handleSubmit() {
        signingIn.value = true
        failed.value = false
        isLockedOut.value = false
        isNotAllowed.value = false

        emit("signingIn", username.value)
        try {
            const success = await store.login({ username: username.value, password: password.value })
            if (success) {
                emit("success", username.value)
            } else {
                emit("fail", username.value)
            }
        } catch (ex: any) {
            // the error carries the request that produced it — the posted { username, password } included
            console.error("login failed", maskAxiosError(ex))
            failed.value = true
            isLockedOut.value = !!ex.response?.data?.isLockedOut
            isNotAllowed.value = !!ex.response?.data?.isNotAllowed
            emit("fail", username.value)
        } finally {
            signingIn.value = false
        }
    }
    function handleForgotPassword() {
        emit("forgotPassword", username.value)
    }

    return {
        username,
        password,

        failed,
        signingIn,
        isLockedOut,
        isNotAllowed,

        handleSubmit,
        handleForgotPassword,
    }
}
