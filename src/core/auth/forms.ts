import type { Box, BoxFactory } from "../box"
import type { IAuthService } from "./auth-service"
import { maskAxiosError } from "./error-logging"

export type LoginInput = { username: string; password: string }

export interface LoginFormEmits {
    (e: "forgotPassword", username?: string): void
    (e: "signingIn", username?: string): void
    (e: "success", username?: string): void
    (e: "fail", username?: string): void
}
export type LoginForm = {
    username: Box<string>
    password: Box<string>
    failed: Box<boolean>
    signingIn: Box<boolean>
    isLockedOut: Box<boolean>
    /** the password was right but the account (or its e-mail/phone) is not confirmed yet */
    isNotAllowed: Box<boolean>
    handleSubmit(): Promise<void>
    handleForgotPassword(): void
}

export function createLoginForm({
    box,
    username: initialUsername,
    login,
    emit,
}: {
    box: BoxFactory
    username?: string
    /** signs in, and answers whether it did */
    login(input: LoginInput): Promise<boolean>
    emit: LoginFormEmits
}): LoginForm {
    const username = box(initialUsername || "")
    const password = box("")

    const failed = box(false)
    const signingIn = box(false)
    const isLockedOut = box(false)
    const isNotAllowed = box(false)

    async function handleSubmit() {
        signingIn.value = true
        failed.value = false
        isLockedOut.value = false
        isNotAllowed.value = false

        emit("signingIn", username.value)
        try {
            const success = await login({ username: username.value, password: password.value })
            if (success) {
                emit("success", username.value)
            } else {
                emit("fail", username.value)
            }
        } catch (ex: any) {
            // the error carries the request that produced it — the posted { username, password } included
            console.error("login failed", maskAxiosError(ex))
            failed.value = true
            isLockedOut.value = !!ex.response?.data?.isLockedOut
            isNotAllowed.value = !!ex.response?.data?.isNotAllowed
            emit("fail", username.value)
        } finally {
            signingIn.value = false
        }
    }
    function handleForgotPassword() {
        emit("forgotPassword", username.value)
    }

    return { username, password, failed, signingIn, isLockedOut, isNotAllowed, handleSubmit, handleForgotPassword }
}

export interface ChangePasswordFormEmits {
    (e: "success"): void
    (e: "fail", ex?: any): void
}
export type ChangePasswordForm = {
    currentPassword: Box<string>
    newPassword: Box<string>
    confirmPassword: Box<string>
    isLoading: Box<boolean>
    isSuccess: Box<boolean | undefined>
    passwordsMatch(): boolean
    isFormValid(): boolean
    handleSubmit(): Promise<void>
}

export function createChangePasswordForm({
    box,
    service,
    emit,
}: {
    box: BoxFactory
    service: IAuthService
    emit: ChangePasswordFormEmits
}): ChangePasswordForm {
    const currentPassword = box("")
    const newPassword = box("")
    const confirmPassword = box("")

    const isLoading = box(false)
    const isSuccess = box<boolean | undefined>(undefined)
    const passwordsMatch = () => newPassword.value === confirmPassword.value
    const isFormValid = () => currentPassword.value != "" && newPassword.value != "" && passwordsMatch()

    async function handleSubmit() {
        if (!isFormValid()) {
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

    return { currentPassword, newPassword, confirmPassword, isLoading, isSuccess, passwordsMatch, isFormValid, handleSubmit }
}

export interface ForgotPasswordFormEmits {
    (e: "success", username?: string): void
    (e: "fail", ex?: any): void
    (e: "login", username?: string): void
}
export type ForgotPasswordOptions = {
    siteUrl: string
    /** @deprecated The API names the mail itself and ignores this. */
    siteName?: string
}
export type ForgotPasswordForm = {
    username: Box<string>
    isLoading: Box<boolean>
    isSuccess: Box<boolean | undefined>
    isFormValid(): boolean
    handleSubmit(): Promise<void>
    /** the owner handed the form another username */
    onUsernameChange(value?: string): void
}

export function createForgotPasswordForm({
    box,
    service,
    username: initialUsername,
    options,
    emit,
}: {
    box: BoxFactory
    service: IAuthService
    username?: string
    options: ForgotPasswordOptions
    emit: ForgotPasswordFormEmits
}): ForgotPasswordForm {
    const isLoading = box(false)
    const username = box(initialUsername || "")
    const isFormValid = () => username.value != ""
    const isSuccess = box<boolean | undefined>(undefined)

    async function handleSubmit() {
        isSuccess.value = undefined
        isLoading.value = true
        try {
            await service.forgotPassword({ username: username.value!, siteUrl: options.siteUrl, siteName: options.siteName })
            emit("success", username.value)
            isSuccess.value = true
        } catch (err: any) {
            isSuccess.value = false
            // the error carries the request that produced it, Authorization header included
            console.error("Resetting password failed", maskAxiosError(err))
            emit("fail", err)
        } finally {
            isLoading.value = false
        }
    }

    return { username, isLoading, isFormValid, isSuccess, handleSubmit, onUsernameChange: (value) => void (username.value = value || "") }
}

export interface ResetPasswordFormEmits {
    (e: "success"): void
    (e: "fail", ex?: any): void
    (e: "login"): void
}
export type ResetPasswordForm = {
    password: Box<string>
    confirmPassword: Box<string>
    isLoading: Box<boolean>
    isSuccess: Box<boolean | undefined>
    passwordsMatch(): boolean
    isFormValid(): boolean
    handleSubmit(): Promise<void>
}

export function createResetPasswordForm({
    box,
    service,
    token,
    emit,
}: {
    box: BoxFactory
    service: IAuthService
    /** the reset token from the recovery link, as the owner holds it when the form submits */
    token(): string
    emit: ResetPasswordFormEmits
}): ResetPasswordForm {
    const password = box("")
    const confirmPassword = box("")

    const isLoading = box(false)
    const isSuccess = box<boolean | undefined>(undefined)
    const passwordsMatch = () => password.value === confirmPassword.value
    const isFormValid = () => password.value != "" && passwordsMatch()

    async function handleSubmit() {
        if (!isFormValid()) {
            return
        }
        isSuccess.value = undefined
        isLoading.value = true
        try {
            await service.resetPassword({ token: token(), password: password.value })
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

    return { password, confirmPassword, isLoading, isSuccess, passwordsMatch, isFormValid, handleSubmit }
}
