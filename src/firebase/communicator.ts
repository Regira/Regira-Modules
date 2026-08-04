//import axios from 'axios';// need axios for IE compatibility
import axios from "axios"

class FirebaseError extends Error {
    code: number
    constructor(message: string, statusCode: number) {
        super(`${message} (${statusCode})`)
        this.code = statusCode
    }
}

type HttpConfig = { url: string; method: string; data?: unknown }
type FirebaseResponse = { status: number; statusText: string; data: { error?: { message: string }; [key: string]: unknown } }

// response parser
const checkResponse = (response: FirebaseResponse) => {
    const statusCode = response.status
    if (statusCode < 200 || statusCode >= 400) {
        const message = response.data && response.data.error ? response.data.error.message : response.statusText
        console.error("Firebase Error", statusCode, { message, response })
        throw new FirebaseError(message, statusCode)
    }
}

// axios wrapper
const http = async (url: string, method: string, data?: unknown) => {
    const config: HttpConfig = { url, method }
    if (typeof data !== "undefined") {
        config.data = data
    }
    const response = await axios(config as unknown as Parameters<typeof axios>[0])
    checkResponse(response as unknown as FirebaseResponse)
    return response.data
}

// Firebase communicator
export default {
    get: (url: string) => http(url, "get"),
    put: (url: string, data?: unknown) => http(url, "put", data),
    post: (url: string, data?: unknown) => http(url, "post", data),
    delete: (url: string) => http(url, "delete"),
}
