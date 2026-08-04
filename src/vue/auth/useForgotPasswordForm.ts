import { ref, computed, watch } from "vue"
import { useAuth } from "./auth"

export interface ForgotPasswordFormEmits {
    (e: "success", username?: string): void
    (e: "fail", ex?: any): void
    (e: "login", username?: string): void
}
export interface ForgotPasswordFormProps {
    username?: string
}

export type ForgotPasswordModalProps = {
    username?: string
    isVisible?: boolean
}
export type ForgotPasswordModalSlots = {
    /** the forgot-password form; scoped with the initial username */
    default?(props: { username?: string }): any
}

export function useForgotPasswordForm(
    props: ForgotPasswordFormProps,
    emit: ForgotPasswordFormEmits,
    options: { siteUrl: string; siteName?: string }
) {
    const { service } = useAuth()

    const isLoading = ref(false)
    const username = ref(props.username || "")
    const isFormValid = computed(() => username.value != "")
    const isSuccess = ref<boolean>()

    async function handleSubmit() {
        isSuccess.value = undefined
        isLoading.value = true
        try {
            await service.forgotPassword({ username: username.value!, siteUrl: options.siteUrl, siteName: options.siteName })
            emit("success", username.value)
            isSuccess.value = true
        } catch (err: any) {
            isSuccess.value = false
            console.error("Resetting password failed", { err })
            emit("fail", err)
        } finally {
            isLoading.value = false
        }
    }

    watch(
        () => props.username,
        () => (username.value = props.username || "")
    )

    return {
        username,
        isLoading,
        isFormValid,
        isSuccess,
        handleSubmit,
    }
}
