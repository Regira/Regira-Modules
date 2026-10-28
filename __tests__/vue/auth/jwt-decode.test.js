import { describe, test, expect } from "vitest"
import { AuthData } from "../../../src/vue/auth/AuthData"

// A real JWT carries its payload as base64url without padding, over UTF-8 JSON. The other auth tests build their
// stubs with btoa (plain base64, Latin-1), which never shows `-` or `_` and cannot hold "Zoë".
const jwtOf = (claims) => `header.${Buffer.from(JSON.stringify({ sub: "1", exp: 9999999999, nbf: 0, ...claims })).toString("base64url")}.signature`

describe("AuthData decodes a JWT payload as base64url over UTF-8", () => {
    test("a payload whose encoding holds - or _ (here from a display name with > or ?)", () => {
        // the characters land on a different 6-bit boundary for each padding length, so try a few
        const tokens = ["", "a", "ab"].flatMap((pad) => ["E2E <Shopper>", "x>y", "a?b"].map((n) => jwtOf({ pad, displayName: n })))
        const urlSafe = tokens.filter((t) => /[-_]/.test(t.split(".")[1]))
        expect(urlSafe.length).toBeGreaterThan(0)
        for (const token of urlSafe) {
            const data = new AuthData(token, { isAuthenticated: true })
            expect(data.get("displayName")).toBe(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).displayName)
        }
    })

    test("a non-ASCII claim reads as written", () => {
        const data = new AuthData(jwtOf({ name: "Zoë", displayName: "Åsa Ñúñez" }), { isAuthenticated: true })
        expect(data.name).toBe("Zoë")
        expect(data.get("displayName")).toBe("Åsa Ñúñez")
    })

    test("a padded base64 payload still decodes", () => {
        const data = new AuthData(`header.${btoa(JSON.stringify({ sub: "7", name: "u", exp: 9999999999, nbf: 0 }))}.signature`, {
            isAuthenticated: true,
        })
        expect(data.userId).toBe("7")
    })
})
