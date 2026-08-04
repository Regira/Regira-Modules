import Event from "./event"

type EventCallback = (event: Event, arg?: unknown) => unknown
type ConstraintFn = (e: unknown, arg?: unknown) => boolean

interface Listener {
    constraint?: ConstraintFn
    callback: EventCallback
    scope?: unknown
    once?: boolean
}

interface ListenerOptions {
    key: string
    constraint?: ConstraintFn
    callback: EventCallback
    thisScope?: unknown
    once?: boolean
}

type ListenerMap = Record<string, Listener[]>

const getOptions = (argArray: unknown[]): ListenerOptions => {
    const key = (argArray[0] as string) ?? ""
    // Positional args after the key, ignoring null/undefined placeholders:
    //   on(key, callback) | on(key, constraint, callback), each with an optional trailing { scope }
    const rest = argArray.slice(1).filter((x) => x != null)
    const thisScope = typeof rest[rest.length - 1] === "object" ? (rest.pop() as Record<string, unknown>)["scope"] : undefined
    const callback = rest.pop() as EventCallback
    const constraint = (typeof rest[rest.length - 1] === "function" ? rest.pop() : undefined) as ConstraintFn | undefined
    return {
        key,
        constraint,
        callback,
        thisScope,
    }
}

function setListener(this: { listeners: ListenerMap }, options: ListenerOptions): void {
    const me = this
    options.key.split(" ").forEach((x) => {
        if (!(x in me.listeners)) {
            me.listeners[x] = []
        }
        const listener: Listener = {
            constraint: options.constraint,
            callback: options.callback,
            scope: options.thisScope,
            once: options.once,
        }
        me.listeners[x].push(listener)
    })
}

class EventHandler {
    static injectInto(target: object): void {
        Object.defineProperties(target, {
            listeners: {
                get(this: { _listeners?: ListenerMap }) {
                    // create new object per instance
                    if (!("_listeners" in this)) {
                        Object.defineProperty(this, "_listeners", { value: {} })
                    }
                    return this._listeners
                },
            },
            on: {
                value(this: { listeners: ListenerMap }) {
                    const options = getOptions([...arguments])
                    setListener.call(this, options)
                    return this
                },
                configurable: true,
            },
            once: {
                value(this: { listeners: ListenerMap }) {
                    const options = getOptions([...arguments])
                    options.once = true
                    setListener.call(this, options)
                    return this
                },
                configurable: true,
            },
            off: {
                value(this: { listeners: ListenerMap }, key: string, listener?: EventCallback) {
                    if (this.listeners[key]) {
                        if (this.listeners[key].length && typeof listener === "function") {
                            const index = this.listeners[key].findIndex((x) => x.callback === listener)
                            if (index >= 0) {
                                this.listeners[key].splice(index, 1)
                            }
                        }
                        if (!this.listeners[key].length || listener == null) {
                            delete this.listeners[key]
                        }
                    }
                    return this
                },
                configurable: true,
            },
            trigger: {
                async value(this: { listeners: ListenerMap; off(key: string, cb: EventCallback): void }, e: Event | string, arg?: unknown) {
                    const me = this
                    const event = typeof e === "string" ? new Event(e) : e
                    const results: unknown[] = []
                    const listeners = (me.listeners[event.type] ?? [])
                        .concat(me.listeners[""] ?? [])
                        .filter((x: Listener) => {
                            return x && (x.constraint == null || x.constraint.call(x.scope ?? me, e, arg))
                        })
                        .map((x: Listener) => {
                            if (x.once) {
                                me.off(event.type, x.callback)
                            }
                            return () => {
                                try {
                                    const result = x.callback.call(x.scope ?? me, event, arg ?? {})
                                    return Promise.resolve(result)
                                } catch (error) {
                                    console.error("Executing listener failed", { error, event, listener: x.callback })
                                    return Promise.resolve(error)
                                }
                            }
                        })

                    return listeners
                        .reduce((r: Promise<unknown>, f: () => Promise<unknown>) => {
                            return r.then(f).then((result) => {
                                results.push(result)
                                return result
                            })
                        }, Promise.resolve<unknown>(undefined))
                        .then(() => results)
                },
                configurable: true,
            },
        })
    }
}

EventHandler.injectInto(EventHandler.prototype)

export default EventHandler
