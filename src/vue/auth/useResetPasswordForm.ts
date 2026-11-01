import { computed, type Ref } from "vue"
import { useAuth } from "./auth"
import { createResetPasswordForm, type ResetPasswordFormEmits } from "../../core/auth/forms"
import { vueBox } from "../box"

export type { ResetPasswordFormEmits }

/** the texts `ResetPasswordForm` shows; each one left out stays English */
export type ResetPasswordFormLabels = {
    /** "New password" */
    newPassword?: string
    /** "Confirm password" */
    confirmPassword?: string
    /** "Passwords don't match." */
    mismatch?: string
    /** "Reset password" */
    submit?: string
    /** "Password reset." */
    succeeded?: string
    /** "Sign in", the link after `succeeded` */
    signIn?: string
    /** "Unfortunately, resetting the password failed." */
    failed?: string
}
export interface ResetPasswordFormProps {
    /** reset token from the recovery link (e-mail) */
    token: string
    /** account name for the (hidden) username field, so password managers can link the new password */
    username?: string
    labels?: ResetPasswordFormLabels
}

export function useResetPasswordForm(props: ResetPasswordFormProps, emit: ResetPasswordFormEmits) {
    const { service } = useAuth()
    const form = createResetPasswordForm({ box: vueBox, service, token: () => props.token, emit })

    return {
        password: form.password as Ref<string>,
        confirmPassword: form.confirmPassword as Ref<string>,

        isLoading: form.isLoading as Ref<boolean>,
        isSuccess: form.isSuccess as Ref<boolean | undefined>,
        passwordsMatch: computed(form.passwordsMatch),
        isFormValid: computed(form.isFormValid),

        handleSubmit: form.handleSubmit,
    }
}
