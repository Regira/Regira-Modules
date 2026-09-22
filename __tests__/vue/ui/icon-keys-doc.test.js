import { describe, test, expect } from "vitest"
import { readFileSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"
import bootstrapIcons from "../../../src/vue/ui/icons/bootstrap-icons"

// ui.signatures → Icons lists every registered key, because an unregistered one renders nothing — the guide is
// where an agent picks a name, so a key added to or dropped from the map must move the list with it.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const guide = readFileSync(join(repoRoot, "src", "vue", "ui", "ai", "ui.signatures.md"), "utf8").replace(/\r\n/g, "\n")

function documentedKeys() {
    const lines = guide.split("\n")
    const start = lines.findIndex((l) => l.startsWith('// Registered keys, source "bs"'))
    expect(start, "the Icons block's key list header").toBeGreaterThan(-1)
    const keys = []
    for (const line of lines.slice(start + 1)) {
        if (!line.startsWith("//   ")) break
        keys.push(
            ...line
                .slice(2)
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
        )
    }
    return keys
}

describe("ui.signatures → Icons", () => {
    test("lists exactly the registered bootstrap-icons keys, in order", () => {
        expect(documentedKeys()).toEqual(Object.keys(bootstrapIcons))
    })
})
