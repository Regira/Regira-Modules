import { describe, test, expect, afterEach } from "vitest"
import { stringifyDate } from "../../src/utilities/datetime-utility"

// Node reads TZ again whenever it changes, so each case runs the serializer in a zone of its own
const originalTz = process.env.TZ
afterEach(() => {
    process.env.TZ = originalTz
})
function inZone(tz, run) {
    process.env.TZ = tz
    return run()
}

describe("stringifyDate", () => {
    test.each([
        ["UTC", "2026-10-20T06:00:00.000+00:00"],
        ["Europe/Brussels", "2026-10-20T08:00:00.000+02:00"],
        ["America/New_York", "2026-10-20T02:00:00.000-04:00"],
        // half-hour zones: the offset was written as "+5.5:30" and the time shifted by whole hours only
        ["Asia/Kolkata", "2026-10-20T11:30:00.000+05:30"],
        ["America/St_Johns", "2026-10-20T03:30:00.000-02:30"],
        ["Asia/Kathmandu", "2026-10-20T11:45:00.000+05:45"],
    ])("writes the local wall-clock time and offset in %s", (tz, expected) => {
        expect(inZone(tz, () => stringifyDate(new Date(Date.UTC(2026, 9, 20, 6, 0, 0))))).toBe(expected)
    })

    test("the string reads back as the same instant", () => {
        const instant = Date.UTC(2026, 9, 20, 6, 0, 0)
        for (const tz of ["Asia/Kolkata", "America/St_Johns", "Pacific/Chatham", "Europe/Brussels"]) {
            expect(new Date(inZone(tz, () => stringifyDate(instant))).getTime(), tz).toBe(instant)
        }
    })

    test("an invalid date gives undefined", () => {
        expect(stringifyDate(new Date("nope"))).toBeUndefined()
    })
})
