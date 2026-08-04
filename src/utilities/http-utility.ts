import { stringifyDate } from "./datetime-utility"
import { redirect as htmlRedirect } from "./html-utility"
import { trim } from "./string-utility"

export const isLocalHost = () => {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1"
}

export const isHttps = (url: string | URL) => {
    const currentUrl = typeof url === "string" ? new URL(url) : url
    return currentUrl.protocol === "https:"
}

export const getHttpsUrl = (url: string) => {
    const currentUrl = new URL(url)
    if (!isHttps(currentUrl)) {
        return "https:" + url.substring(currentUrl.protocol.length)
    }
    return url
}

export const forceHttps = (currentUrl: string) => {
    const httpsUrl = getHttpsUrl(currentUrl)
    if (httpsUrl !== currentUrl && !isLocalHost()) {
        htmlRedirect(httpsUrl)
    }
}

export function tryCreateValidURL(input: string): string {
    if (!input) {
        return input
    }

    let url = input.trim()

    if (!url.match(/^(http:\/\/|https:\/\/)/)) {
        url = "https://" + url
    }

    return url
}

export const toAbsoluteUrl = (relative: string, baseUrl?: string) => {
    // https://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript#answer-14780463
    if (!baseUrl) {
        baseUrl = window.location.origin
    }
    const stack = baseUrl.split("/")
    const parts = trim(relative, "/").split("/")
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== ".") {
            if (parts[i] === "..") {
                stack.pop()
            } else {
                stack.push(parts[i])
            }
        }
    }
    return stack.join("/")
}

export const toQueryString = (obj: Record<string, unknown>, includeNulls = false) => {
    // A Date is stringified with stringifyDate (local wall clock + offset, matching request bodies): the
    // default coercion emits "Wed Jul 29 2026 07:00:00 GMT+0200 (…)", which a DateTime model binder 400s on.
    // It must also be caught before the object branch below, which would otherwise walk its (empty) own
    // properties and drop the value silently. An INVALID Date yields undefined and the pair is omitted —
    // "?from=" binds to default on the server, i.e. a wrong result set that looks like a successful filter.
    const serializeValue = (value: unknown): string | undefined => (value instanceof Date ? stringifyDate(value) : String(value))
    const toPair = (key: string, value: unknown): string[] => {
        const serialized = serializeValue(value)
        return serialized === undefined ? [] : [`${encodeURIComponent(key)}=${encodeURIComponent(serialized)}`]
    }
    const serialize = (obj: Record<string, unknown>, prefix?: string): string[] => {
        return Object.entries(obj)
            .filter((e) => includeNulls || e[1] != null)
            .flatMap(([key, value]) => {
                const fullKey = prefix ? `${prefix}[${key}]` : key
                return Array.isArray(value)
                    ? value.flatMap((v) => toPair(fullKey, v)) // array
                    : typeof value === "object" && value !== null && !(value instanceof Date)
                      ? serialize(value as Record<string, unknown>, fullKey) // object
                      : toPair(fullKey, value) // normal key-value
            })
    }
    return serialize(obj).join("&")
}

export const getQueryStringParams = (url: string = window.location.href) => {
    const urlObj = new URL(url)
    const queryParams = new URLSearchParams(urlObj.search)
    return Object.fromEntries(queryParams.entries())
}

// utility
export default {
    isLocalHost,
    getHttpsUrl,
    forceHttps,
    toQueryString,
    getQueryStringParams,
}
