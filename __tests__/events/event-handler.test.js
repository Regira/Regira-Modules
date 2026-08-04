import { describe, test, expect } from "vitest"
import EventHandler from "../../src/events/event-handler"

function makeEmitter() {
    const target = {}
    EventHandler.injectInto(target)
    return target
}

describe("EventHandler argument parsing", () => {
    test("on(key, constraint, callback) honors the 3-argument positional constraint", async () => {
        const emitter = makeEmitter()
        const seen = []
        emitter.on(
            "ping",
            (_e, arg) => arg.allow === true,
            (_event, arg) => seen.push(arg.value)
        )

        await emitter.trigger("ping", { allow: false, value: "blocked" })
        await emitter.trigger("ping", { allow: true, value: "passed" })

        expect(seen).toEqual(["passed"])
    })

    test("a trailing { scope } object binds `this` inside the callback", async () => {
        const emitter = makeEmitter()
        const scope = { received: null }
        emitter.on(
            "login",
            function (_event, arg) {
                this.received = arg.user
            },
            { scope }
        )

        await emitter.trigger("login", { user: "alice" })

        expect(scope.received).toBe("alice")
    })

    test("the wildcard empty key fires for every trigger", async () => {
        const emitter = makeEmitter()
        const types = []
        emitter.on("", (event) => types.push(event.type))

        await emitter.trigger("a")
        await emitter.trigger("b")

        expect(types).toEqual(["a", "b"])
    })

    test("an explicit null scope is treated as omitted and does not throw", async () => {
        const emitter = makeEmitter()
        const seen = []
        expect(() => emitter.on("evt", (_event, arg) => seen.push(arg.v), null)).not.toThrow()

        await emitter.trigger("evt", { v: 1 })

        expect(seen).toEqual([1])
    })
})
