import type { Box, BoxFactory } from "../box"
import type { FeedbackError } from "./errors"

export enum FeedbackStatus {
    none = "",
    pending = "Pending",
    success = "Success",
    failed = "Failed",
}

export type FeedbackIn = {
    autoHideDelay?: number
}

/** what a controller reports to: the four methods, so any feedback object a caller passes in works */
export interface FeedbackSink {
    pending(msg: string): void
    success(msg: string): void
    /** `errors` is a FIELD-ERROR MAP or a string, never an `Error` — see {@link FeedbackError}. */
    fail(msg: string, errors?: FeedbackError): void
    reset(): void
}

export interface FeedbackState extends FeedbackSink {
    status: Box<FeedbackStatus>
    message: Box<string>
    error: Box<FeedbackError | undefined>
    /** busy flag — `status === FeedbackStatus.pending` */
    isPending(): boolean
}

export function createFeedback({ box, autoHideDelay = 1500 }: FeedbackIn & { box: BoxFactory }): FeedbackState {
    const status = box<FeedbackStatus>(FeedbackStatus.none)
    const message = box<string>("")
    const error = box<FeedbackError | undefined>(undefined)
    const isPending = () => status.value === FeedbackStatus.pending

    // only a success hides itself; every other state change cancels a hide still pending, or a failure or
    // a new pending shown within autoHideDelay of a success would be wiped by that success's timer
    let timeout: any

    function fadeOut() {
        if (autoHideDelay > 0) {
            clearTimeout(timeout)
            timeout = setTimeout(reset, autoHideDelay)
        }
    }

    function reset() {
        clearTimeout(timeout)
        status.value = FeedbackStatus.none
        message.value = ""
        error.value = undefined
    }
    function pending(msg: string) {
        clearTimeout(timeout)
        status.value = FeedbackStatus.pending
        message.value = msg
        error.value = undefined
    }
    function success(msg: string) {
        status.value = FeedbackStatus.success
        message.value = msg
        error.value = undefined
        autoHideDelay && fadeOut()
    }
    function fail(msg: string, errors?: FeedbackError) {
        clearTimeout(timeout)
        status.value = FeedbackStatus.failed
        message.value = msg
        if (typeof errors === "string") {
            message.value = `${message.value}: ${errors.split("\n")[0]}`
        } else {
            // a caller who passes the exception itself instead of the field map gets its text rather than a
            // blank panel — tested on the instance, so a form field that happens to be named `message` stays a field
            error.value = (errors as unknown) instanceof Error ? (errors as unknown as Error).message : errors
        }
    }

    return { status, message, error, isPending, pending, success, fail, reset }
}
