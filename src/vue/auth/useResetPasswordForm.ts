import { ref, computed } from "vue"
import { useAuth } from "./auth"

export interface ResetPasswordFormEmits {
    (e: "success"): void
    (e: "fail", ex?: any): void
    (e: "login"): void
}
export interface ResetPasswordFormProps {
    /** reset token from the recovery link (e-mail) */
    token: string
    /** account name for the (hidden) username field, so password managers can link the new password */
    username?: string
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
            console.error("resetting password failed", { ex })
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
