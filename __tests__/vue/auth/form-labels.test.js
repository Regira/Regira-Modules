import { describe, test, expect, beforeAll, beforeEach } from "vitest"
import { createApp, h, nextTick } from "vue"
import { createPinia, setActivePinia } from "pinia"
import { createAuth } from "../../../src/vue/auth/auth"
import { useAuthStore } from "../../../src/vue/auth/store"
import LoginForm from "../../../src/vue/auth/LoginForm.vue"
import LoginModal from "../../../src/vue/auth/LoginModal.vue"
import ForgotPasswordModal from "../../../src/vue/auth/ForgotPasswordModal.vue"
import ChangePasswordForm from "../../../src/vue/auth/ChangePasswordForm.vue"
import ResetPasswordForm from "../../../src/vue/auth/ResetPasswordForm.vue"
import LogoutForm from "../../../src/vue/auth/LogoutForm.vue"

// The account forms rendered fixed text, so a translated app showed its sign-in, password and sign-out screens in
// English (and LogoutForm in Dutch). Each takes `labels` now, English by default, as FormButtonsRow does.

const axios = { interceptors: { request: { use: () => {} }, response: { use: () => {} } }, post: async () => ({ data: {} }) }
beforeAll(() => createAuth({ enabled: true, tokenManager: {}, axios }))

let pinia
beforeEach(() => {
    document.body.innerHTML = '<div id="modals"></div>'
    pinia = createPinia()
    setActivePinia(pinia)
})

async function render(component, props) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const app = createApp({ render: () => h(component, props) })
    app.use(pinia)
    app.mount(host)
    await nextTick()
    return document.body.textContent.replace(/\s+/g, " ")
}

describe("the account forms' labels", () => {
    test("LoginForm shows its labels, and English for each one left out", async () => {
        const text = await render(LoginForm, { labels: { username: "Gebruikersnaam", signIn: "Aanmelden" } })

        expect(text).toContain("Gebruikersnaam")
        expect(text).toContain("Aanmelden")
        expect(text).toContain("Password")
        expect(text).not.toContain("Username")
    })

    test("LoginModal hands its labels to the default form", async () => {
        const text = await render(LoginModal, { title: "Aanmelden", labels: { forgotPassword: "Wachtwoord vergeten?" } })

        expect(text).toContain("Wachtwoord vergeten?")
    })

    test("ForgotPasswordModal takes a title", async () => {
        expect(await render(ForgotPasswordModal, { title: "Wachtwoord vergeten" })).toContain("Wachtwoord vergeten")
        document.body.innerHTML = '<div id="modals"></div>'
        expect(await render(ForgotPasswordModal, {})).toContain("Forgot password")
    })

    test("ChangePasswordForm and ResetPasswordForm show their labels", async () => {
        expect(await render(ChangePasswordForm, { labels: { currentPassword: "Huidig wachtwoord", submit: "Wijzigen" } })).toMatch(
            /Huidig wachtwoord.*Wijzigen/
        )
        expect(await render(ResetPasswordForm, { token: "t", labels: { newPassword: "Nieuw wachtwoord" } })).toMatch(/Nieuw wachtwoord.*Reset password/)
    })

    test("LogoutForm is English by default and puts the name where the label says", async () => {
        useAuthStore().authData = { isAuthenticated: true, displayName: "Anna", expires: 0 }

        expect(await render(LogoutForm, {})).toContain("Sign out Anna")
        expect(await render(LogoutForm, { labels: { signOut: "{name} afmelden" } })).toContain("Anna afmelden")
    })

    test("LogoutForm writes a name as it is, a replacement pattern like $& included", async () => {
        useAuthStore().authData = { isAuthenticated: true, displayName: "Tom $& Co", expires: 0 }

        expect(await render(LogoutForm, {})).toContain("Sign out Tom $& Co")
    })
})
