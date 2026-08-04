import { ref, computed } from "vue"
import { useAuth } from "./auth"

export interface ChangePasswordFormEmits {
    (e: "success"): void
    (e: "fail", ex?: any): void
}
export interface ChangePasswordFormProps {
    /** account name for the (hidden) username field, so password managers can link the new password */
    username?: string
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
            console.error("changing password failed", { ex })
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
