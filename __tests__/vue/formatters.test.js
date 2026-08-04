import { describe, test, expect } from "vitest"
import { dateInputString, formatDate, formatDateTime, formatShortDate, formatTime } from "../../src/vue/formatters"

// local-time constructor + local-time getters, so these are timezone independent
const evening = new Date(2026, 6, 25, 23, 5, 9, 7) // 2026-07-25 23:05:09.007
const morning = new Date(2026, 6, 5, 9, 5, 0, 0) // 2026-07-05 09:05

describe("formatDateTime masks", () => {
    test("renders the documented default mask", () => {
        expect(formatDateTime(evening)).toBe("25-07-2026")
    })

    test("yy is the LAST TWO digits of the year, not the padded 4-digit one", () => {
        // padStart(2) on "2026" is a no-op, so this used to render 25/07/2026
        expect(formatDateTime(evening, "dd/MM/yy")).toBe("25/07/26")
        expect(formatDateTime(evening, "yyyy")).toBe("2026")
    })

    test("hh is 24-hour (the long-standing contract) and H/HH are aliases for the conventional spelling", () => {
        expect(formatDateTime(evening, "hh:mm")).toBe("23:05")
        expect(formatDateTime(evening, "HH:mm")).toBe("23:05")
        expect(formatDateTime(evening, "h:m")).toBe("23:5")
        expect(formatDateTime(evening, "H:m")).toBe("23:5")
        expect(formatDateTime(morning, "hh:mm")).toBe("09:05")
        expect(formatDateTime(morning, "HH:mm")).toBe("09:05")
    })

    test("every n-token width resolves — nn/nnn/nnnn used to render empty", () => {
        expect(formatDateTime(evening, "n")).toBe("7")
        expect(formatDateTime(evening, "nn")).toBe("07")
        expect(formatDateTime(evening, "nnn")).toBe("007")
        expect(formatDateTime(evening, "nnnn")).toBe("0007")
        expect(formatDateTime(evening, "hh:mm.nnn")).toBe("23:05.007")
    })

    test("single- and double-width day/month tokens", () => {
        expect(formatDateTime(morning, "d/M/yyyy")).toBe("5/7/2026")
        expect(formatDateTime(morning, "dd/MM/yyyy")).toBe("05/07/2026")
    })

    test("non-token characters pass through verbatim", () => {
        expect(formatDateTime(morning, "dd.MM.yyyy 'T'")).toBe("05.07.2026 'T'")
    })

    test("no date yields an empty string", () => {
        expect(formatDateTime(undefined, "dd-MM-yyyy")).toBe("")
        expect(formatDateTime(new Date("nonsense"), "dd-MM-yyyy")).toBe("")
    })

    test("a mask is NOT a culture — the documented trap stays reproducible", () => {
        // formatDate/formatShortDate take a culture; formatDateTime takes a mask. The `n` of "en" is
        // milliseconds. Documented on the @param, deliberately not auto-detected: "dd-MM" is itself a
        // plausible locale-tag shape, so detection would misfire on real masks.
        expect(formatDateTime(evening, "en-GB")).toBe("e7-GB")
    })
})

describe("formatTime", () => {
    test("renders the hours, not the literal token", () => {
        // the mask used to be "HH:mm" while the token map only knew lowercase h — output was "HH:05"
        expect(formatTime(evening)).toBe("23:05")
        expect(formatTime(morning)).toBe("09:05")
        expect(formatTime(new Date(2026, 6, 25, 0, 0))).toBe("00:00")
    })

    test("no date yields an empty string", () => {
        expect(formatTime(undefined)).toBe("")
    })
})

describe("dateInputString", () => {
    test("emits the ISO-ish value an <input type=date> accepts", () => {
        expect(dateInputString(morning)).toBe("2026-07-05")
        expect(dateInputString(evening)).toBe("2026-07-25")
    })
})

describe("culture-taking formatters", () => {
    test("formatDate takes a CULTURE, unlike formatDateTime", () => {
        expect(formatDate(morning, "en-GB")).toBe("05/07/2026")
        expect(formatDate(undefined)).toBe("")
    })

    test("formatShortDate flips day/month for US cultures", () => {
        expect(formatShortDate(morning, "en-GB")).toBe("05/07")
        expect(formatShortDate(morning, "en-US")).toBe("07/05")
    })
})
