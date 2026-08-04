import Event from "./event"
import { except } from "../utilities/array-utility"

class ErrorEvent extends Event {
    constructor(...args: unknown[]) {
        const type = args.find((x): x is string => typeof x === "string")
        const src = args.find((x): x is Event => x instanceof Event)
        const data = except(args, [type, src])[0] as Record<string, unknown> | undefined
        super(type ?? "error", src, data)
    }
}

export default ErrorEvent
