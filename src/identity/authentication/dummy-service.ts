class AuthenticationService {
    constructor() {
        console.warn("This is a dummy-service")
    }

    async login(_email: string, _password: string): Promise<void> {
        console.warn("Not implemented: login")
    }
    async refresh(_refreshToken: string): Promise<void> {
        console.warn("Not implemented: refresh")
    }
    async resetPassword(_email: string): Promise<void> {
        console.warn("Not implemented: resetPassword")
    }
}

export default AuthenticationService
