import { startsWith } from "../../utilities/string-utility"
import { format as _format, isDate, isValid } from "date-fns"

function _formatDateTime(date?: Date, mask?: string) {
    if (!date) {
        return ""
    }

    if (typeof date == "string") {
        date = new Date(date)
    }

    if (!isDate(date) || !isValid(date)) {
        return ""
    }

    if (mask == null) {
        return date.toLocaleDateString()
    }

    const padZero = (value: number, maxLength: number = 2) => value.toString().padStart(maxLength, "0")
    const map: Record<string, string | number> = {
        d: date.getDate(),
        dd: padZero(date.getDate()),
        M: date.getMonth() + 1,
        MM: padZero(date.getMonth() + 1),
        yy: padZero(date.getFullYear() % 100), // the last two digits — padZero on the 4-digit year is a no-op
        yyyy: padZero(date.getFullYear(), 4),
        // hours are 24-hour by long-standing contract; H/HH are aliases so the conventional spelling works too
        h: date.getHours(),
        hh: padZero(date.getHours()),
        H: date.getHours(),
        HH: padZero(date.getHours()),
        m: date.getMinutes(),
        mm: padZero(date.getMinutes()),
        // milliseconds, zero-padded to the token length
        n: date.getMilliseconds(),
        nn: padZero(date.getMilliseconds()),
        nnn: padZero(date.getMilliseconds(), 3),
        nnnn: padZero(date.getMilliseconds(), 4),
    }

    return mask.replace(/d{1,2}|M{1,2}|yy(?:yy)?|H{1,2}|h{1,2}|m{1,2}|n{1,4}/g, (matched) => map[matched]?.toString() ?? "")
}

/**
 * Formats a date with a token MASK — not a culture. `formatDate`/`formatShortDate` are the culture-taking
 * pair; passing a locale tag here silently token-substitutes it (`"en-GB"` → `"e<ms>-GB"`, the `n` being
 * the date's milliseconds).
 * @param date the date to format — null/invalid yields `""`
 * @param mask tokens: `d`/`dd`, `M`/`MM`, `yy`/`yyyy`, `h`/`hh` (24-hour, aliases `H`/`HH`), `m`/`mm`,
 * `n`…`nnnn` (milliseconds). Every other character is emitted verbatim.
 */
export const formatDateTime = (date?: Date, mask: string = "dd-MM-yyyy") => (date ? _formatDateTime(date, mask) : "")
export const dateInputString = (date?: Date) => formatDateTime(date, "yyyy-MM-dd")
export const formatTime = (date?: Date) => formatDateTime(date, "hh:mm")

export const formatDate = (date?: Date | string, culture?: string) => {
    if (date == null) {
        return ""
    }
    if (typeof date == "string") {
        date = new Date(date)
    }

    return date.toLocaleDateString(culture) //?.replace(/-/g, '/')
}
export const formatShortDate = (date?: Date | string, culture?: string) => {
    if (date == null) {
        return ""
    }
    if (typeof date == "string") {
        date = new Date(date)
    }
    if (culture?.includes("US")) {
        return _format(date, "MM/dd")
    }

    return _format(date, "dd/MM")
}

export function formatNumber(value?: number, culture?: string, minDigits = 2, maxDigits = minDigits) {
    if (value == null) {
        return ""
    }
    return value?.toLocaleString(culture, {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits,
    })
}
export function formatNumberCompact(value?: number, culture?: string) {
    if (value == null) {
        return ""
    }
    return value.toLocaleString(culture, { notation: "compact" })
}
export function formatCurrency(value?: number, culture?: string, currency: string = "EUR") {
    if (value == null) {
        return ""
    }
    return value.toLocaleString(culture, { style: "currency", currency })
}
export function formatCurrencyCompact(value?: number, culture?: string, currency: string = "EUR") {
    if (value == null) {
        return ""
    }
    return value.toLocaleString(culture, { style: "currency", currency, notation: "compact" })
}
export function formatPercentage(value?: number, culture?: string) {
    if (value == null) {
        return ""
    }

    return (value > 1 ? value / 100 : value).toLocaleString(culture, { style: "percent" })
}

export const formatBankaccount = (input: string) => {
    if (input == null || !(input.length === 16 && startsWith(input, "BE", true))) {
        return ""
    }

    return `${input.slice(0, 4)} ${input.slice(4, 8)} ${input.slice(8, 12)} ${input.slice(12, 16)}`
}

export const getInitials = (input: string) => {
    return input
        .replace(/\s+/gi, " ")
        .replace(/[^a-z 0-9]+/gi, "")
        .trim()
        .split(" ")
        .map((x) => x[0])
        .join("")
        .toUpperCase()
}

export const formatTextPreserveNewLines = (input: string) => {
    return (input || "").replace(/\n/g, "<br/>")
}

export const formatStructuredReference = (input: string) => {
    if (!input) {
        return input
    }

    const digits = input.match(/\d/g)
    if (digits == null) {
        return input
    }
    const groups = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 12)]
    return groups
        .filter((g) => g.length > 0)
        .map((g) => g.join(""))
        .join("/")
}

export function shortenString(str: string | undefined, maxLength: number) {
    if (!str || (str?.length ?? 0) <= maxLength) {
        return str
    }

    // Check if the string is longer than the maximum length.
    // Find the last white-space or other ending character before the maximum length.
    const lastEndingCharIndex = str.lastIndexOf(" ", maxLength) || str.lastIndexOf(",", maxLength) || str.lastIndexOf(".", maxLength)

    // If such a character exists, truncate the string at that index.
    if (lastEndingCharIndex > -1) {
        str = str.substring(0, lastEndingCharIndex)
    }

    // Return the shortened string.
    return str + "..."
}
