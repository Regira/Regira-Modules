import { describe, test, expect } from "vitest"
import { formatText } from "../../../src/vue/lang/formatText"

// `{name}` placeholders take their args; one without an arg of its name stays as written
describe("formatText", () => {
    test("fills each placeholder with its arg, and leaves one without", () => {
        expect(formatText("{a} and {b}, {c}", { a: 1, b: "two" })).toBe("1 and two, {c}")
    })

    test("matches names by case unless told to ignore it", () => {
        expect(formatText("At most {MaxLength}", { maxLength: 20 })).toBe("At most {MaxLength}")
        expect(formatText("At most {MaxLength}", { maxLength: 20 }, { ignoreCase: true })).toBe("At most 20")
    })

    // a value is inserted as written, and a name is no pattern
    test("inserts a value literally, whatever its characters", () => {
        expect(formatText("Price: {price}", { price: "$& $1" })).toBe("Price: $& $1")
        expect(formatText("{a.b} {x+}", { "a.b": "dot", "x+": "plus" })).toBe("dot plus")
    })

    test("reads only the args' own names", () => {
        expect(formatText("{constructor}", {})).toBe("{constructor}")
    })
})
