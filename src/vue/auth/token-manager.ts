const DEFAULT_TOKEN_NAME = "auth:token"

export interface ITokenManager {
    get token(): string | undefined
    set token(value: string | undefined)
}

export class CookieTokenManager implements ITokenManager {
    constructor(private prefix: string = "") {}

    get token(): string | undefined {
        const tokenObj = Object.fromEntries(
            (document.cookie || "")
                .split(";")
                .filter((x) => x.indexOf("=") > 1 && x.indexOf("=") < x.length - 1)
                .map((x) => [x.substring(0, x.indexOf("=")).trim(), x.substring(x.indexOf("=") + 1).trim()])
        )
        return tokenObj[this.fullKey]
    }
    set token(value: string | undefined) {
        if (value != null) {
            document.cookie = `${this.fullKey}=${value}; path=/;`
        } else {
            document.cookie = `${this.fullKey}=;expires=${new Date(0).toUTCString()}; path=/;`
        }
    }

    get fullKey() {
        return this.prefix + DEFAULT_TOKEN_NAME
    }
}

export class MemoryTokenManager implements ITokenManager {
    constructor(private _token: string | undefined) {}

    get token() {
        return this._token
    }
    set token(value) {
        this._token = value
    }
}

export class LocalStorageTokenManager implements ITokenManager {
    constructor(private prefix: string = "") {}

    get token(): string | undefined {
        return localStorage.getItem(this.fullKey) ?? undefined
    }
    set token(value: string | undefined) {
        if (value) {
            localStorage.setItem(this.fullKey, value)
        } else {
            localStorage.removeItem(this.fullKey)
        }
    }

    get fullKey() {
        return this.prefix + DEFAULT_TOKEN_NAME
    }
}
