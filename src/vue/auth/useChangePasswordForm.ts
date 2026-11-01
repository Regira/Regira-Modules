import { computed, type Ref } from "vue"
import { useAuth } from "./auth"
import { createChangePasswordForm, type ChangePasswordFormEmits } from "../../core/auth/forms"
import { vueBox } from "../box"

export type { ChangePasswordFormEmits }

/** the texts `ChangePasswordForm` shows; each one left out stays English */
export type ChangePasswordFormLabels = {
    /** "Current password" */
    currentPassword?: string
    /** "New password" */
    newPassword?: string
    /** "Confirm password" */
    confirmPassword?: string
    /** "Passwords don't match." */
    mismatch?: string
    /** "Change password" */
    submit?: string
    /** "Password changed." */
    succeeded?: string
    /** "Unfortunately, changing the password failed." */
    failed?: string
}
export interface ChangePasswordFormProps {
    /** account name for the (hidden) username field, so password managers can link the new password */
    username?: string
    labels?: ChangePasswordFormLabels
}

export function useChangePasswordForm(emit: ChangePasswordFormEmits) {
    const { service } = useAuth()
    const form = createChangePasswordForm({ box: vueBox, service, emit })

    return {
        currentPassword: form.currentPassword as Ref<string>,
        newPassword: form.newPassword as Ref<string>,
        confirmPassword: form.confirmPassword as Ref<string>,

        isLoading: form.isLoading as Ref<boolean>,
        isSuccess: form.isSuccess as Ref<boolean | undefined>,
        passwordsMatch: computed(form.passwordsMatch),
        isFormValid: computed(form.isFormValid),

        handleSubmit: form.handleSubmit,
    }
}
