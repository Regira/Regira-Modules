import { computed, watch, type Ref } from "vue"
import { useAuth } from "./auth"
import { createForgotPasswordForm, type ForgotPasswordFormEmits, type ForgotPasswordOptions } from "../../core/auth/forms"
import { vueBox } from "../box"

export type { ForgotPasswordFormEmits }

/** the modal's close: its header X or Esc */
export interface ForgotPasswordModalEmits {
    (e: "close"): void
}
export interface ForgotPasswordFormProps {
    username?: string
}

export type ForgotPasswordModalProps = {
    username?: string
    /** "Forgot password" by default */
    title?: string
    isVisible?: boolean
}
export type ForgotPasswordModalSlots = {
    /** the forgot-password form; scoped with the initial username */
    default?(props: { username?: string }): any
}

export function useForgotPasswordForm(props: ForgotPasswordFormProps, emit: ForgotPasswordFormEmits, options: ForgotPasswordOptions) {
    const { service } = useAuth()
    const form = createForgotPasswordForm({ box: vueBox, service, username: props.username, options, emit })

    watch(() => props.username, form.onUsernameChange)

    return {
        username: form.username as Ref<string>,
        isLoading: form.isLoading as Ref<boolean>,
        isFormValid: computed(form.isFormValid),
        isSuccess: form.isSuccess as Ref<boolean | undefined>,
        handleSubmit: form.handleSubmit,
    }
}
