import type { Ref } from "vue"
import { useAuthStore } from "./store"
import { createLoginForm, type LoginFormEmits, type LoginInput } from "../../core/auth/forms"
import { vueBox } from "../box"

export type { LoginFormEmits, LoginInput }

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
    const store = useAuthStore()
    const form = createLoginForm({ box: vueBox, username: props.username, login: (input) => store.login(input), emit })

    return {
        username: form.username as Ref<string>,
        password: form.password as Ref<string>,

        failed: form.failed as Ref<boolean>,
        signingIn: form.signingIn as Ref<boolean>,
        isLockedOut: form.isLockedOut as Ref<boolean>,
        /** the password was right but the account (or its e-mail/phone) is not confirmed yet */
        isNotAllowed: form.isNotAllowed as Ref<boolean>,

        handleSubmit: form.handleSubmit,
        handleForgotPassword: form.handleForgotPassword,
    }
}
