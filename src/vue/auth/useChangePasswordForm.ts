import { ref, computed } from "vue"
import { useAuth } from "./auth"
import { maskAxiosError } from "./error-logging"

export interface ChangePasswordFormEmits {
    (e: "success"): void
    (e: "fail", ex?: any): void
}
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

    const currentPassword = ref("")
    const newPassword = ref("")
    const confirmPassword = ref("")

    const isLoading = ref(false)
    const isSuccess = ref<boolean>()
    const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)
    const isFormValid = computed(() => currentPassword.value != "" && newPassword.value != "" && passwordsMatch.value)

    async function handleSubmit() {
        if (!isFormValid.value) {
            return
        }
        isSuccess.value = undefined
        isLoading.value = true
        try {
            await service.changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
            isSuccess.value = true
            currentPassword.value = ""
            newPassword.value = ""
            confirmPassword.value = ""
            emit("success")
        } catch (ex: any) {
            isSuccess.value = false
            // the error carries the request that produced it — both posted passwords included
            console.error("changing password failed", maskAxiosError(ex))
            emit("fail", ex)
        } finally {
            isLoading.value = false
        }
    }

    return {
        currentPassword,
        newPassword,
        confirmPassword,

        isLoading,
        isSuccess,
        passwordsMatch,
        isFormValid,

        handleSubmit,
    }
}
