import { ref, computed } from "vue"
import { useAuth } from "./auth"
import { maskAxiosError } from "../../core/auth/error-logging"

export interface ResetPasswordFormEmits {
    (e: "success"): void
    (e: "fail", ex?: any): void
    (e: "login"): void
}
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

    const password = ref("")
    const confirmPassword = ref("")

    const isLoading = ref(false)
    const isSuccess = ref<boolean>()
    const passwordsMatch = computed(() => password.value === confirmPassword.value)
    const isFormValid = computed(() => password.value != "" && passwordsMatch.value)

    async function handleSubmit() {
        if (!isFormValid.value) {
            return
        }
        isSuccess.value = undefined
        isLoading.value = true
        try {
            await service.resetPassword({ token: props.token, password: password.value })
            isSuccess.value = true
            emit("success")
        } catch (ex: any) {
            isSuccess.value = false
            // the error carries the request that produced it — the reset token and new password included
            console.error("resetting password failed", maskAxiosError(ex))
            emit("fail", ex)
        } finally {
            isLoading.value = false
        }
    }

    return {
        password,
        confirmPassword,

        isLoading,
        isSuccess,
        passwordsMatch,
        isFormValid,

        handleSubmit,
    }
}
