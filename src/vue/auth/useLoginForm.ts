import { ref } from "vue"
import { useAuthStore } from "./store"

export type LoginInput = { username: string; password: string }

export interface LoginFormEmits {
    (e: "forgotPassword", username?: string): void
    (e: "signingIn", username?: string): void
    (e: "success", username?: string): void
    (e: "fail", username?: string): void
}
export interface LoginFormProps {
    username?: string
}

export type LoginModalProps = {
    username?: string
    title?: string
    /** visibility is a real prop (defaults on); prefer gating the whole component with v-if —
     * it unmounts mask + dialog in one go and cannot strand a leave-transition */
    isVisible?: boolean
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

    const store = useAuthStore()

    async function handleSubmit() {
        signingIn.value = true
        failed.value = false

        emit("signingIn", username.value)
        try {
            const success = await store.login({ username: username.value, password: password.value })
            if (success) {
                emit("success", username.value)
            } else {
                emit("fail", username.value)
            }
        } catch (ex: any) {
            console.error("login failed", { ex })
            failed.value = true
            isLockedOut.value = ex.response?.data?.isLockedOut
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

        handleSubmit,
        handleForgotPassword,
    }
}
