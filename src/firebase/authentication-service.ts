import { login, refresh, resetPassword } from "./authentication-utility"

class AuthenticationService {
    apiKey: string
    constructor(options: string | { apiKey: string }) {
        this.apiKey = typeof options === "string" ? options : options.apiKey
    }

    async login(email: string, password: string) {
        return login(this.apiKey, email, password)
    }
    async refresh(refreshToken: string) {
        return refresh(this.apiKey, refreshToken)
    }
    async resetPassword(email: string) {
        return resetPassword(this.apiKey, email)
    }
}

export default AuthenticationService
