import type { Box, BoxFactory } from "../../box"
import { deepCopy } from "../../../utilities/object-utility"
import { createFeedback, type FeedbackSink, type FeedbackState } from "../../feedback/feedback"
import { toFeedbackError } from "../../feedback/errors"
import type { IEntity } from "../abstractions/IEntity"
import type { IEntityService, SaveResult } from "../abstractions/IEntityService"

/**
 * What `changeState` reports: a write emits `pending`, then one final state — `saved` for a save or restore that
 * succeeded, `removed` for a delete that succeeded, `error` for any write the server refused or that failed.
 */
export enum FormStates {
    pending = "Pending",
    saved = "Saved",
    removed = "Removed",
    error = "Error",
}

/** the events a form sends, in the order it sends them */
export type FormEvent<T extends IEntity> =
    | ["update:modelValue", T | undefined]
    | ["save", SaveResult<T>]
    | ["remove", T]
    | ["restore", T]
    | ["cancel", { canceled: T; original?: T }]
    | ["changeState", FormStates]

export type FormFailure = { status?: number; title?: string }

export type FormInput<T extends IEntity, F extends FeedbackSink = FeedbackState> = {
    box: BoxFactory
    service: IEntityService<T>
    /** the item the form edits, as its owner holds it now */
    modelValue(): T
    /** read when a handler runs: a permission-gated form mounts before the stored token is restored */
    readonly(): boolean
    isPopup(): boolean
    emit(...event: FormEvent<T>): void
    /** after an insert outside a popup: where the form goes with the saved item */
    navigateAfterInsert(saved: T): void
    feedback?: F
}
export type Form<T extends IEntity, F extends FeedbackSink = FeedbackState> = {
    item: Box<T>
    original: Box<T | undefined>
    feedback: F
    failure: Box<FormFailure | undefined>
    handleCancel(): void
    handleSubmit(): Promise<void>
    handleRemove(): Promise<void>
    handleRestore(): Promise<void>
    /** the view mounted: the copy Cancel goes back to */
    mount(): void
    /** the owner handed the form another item */
    onModelValueChange(value: T): void
}

export function createForm<T extends IEntity, F extends FeedbackSink = FeedbackState>({
    box,
    service,
    modelValue,
    readonly,
    isPopup,
    emit,
    navigateAfterInsert,
    feedback: sink,
}: FormInput<T, F>): Form<T, F> {
    type IArchivable = T & { isArchived: boolean }

    // a box instead of a view of the owner's item, to keep the edited value when the item reloads from the pool elsewhere
    const item = box<T>(modelValue())
    const original = box<T | undefined>(undefined)
    const failure = box<FormFailure | undefined>(undefined)
    const feedback = sink ?? (createFeedback({ box }) as FeedbackSink as F)
    // what `failure` keeps of a rejection, which may carry no response (a network failure) or no reason at all
    const toFailure = (error: any) => {
        const title = error?.response?.data?.title
        return { status: error?.response?.status, title: typeof title === "string" ? title : undefined }
    }

    function handleCancel(): void {
        emit("cancel", { canceled: item.value, original: original.value as T })
        // restore a fresh copy so `original` stays pristine and Cancel works on every click, not just the first
        item.value = service.toEntity(deepCopy(original.value as T))
    }

    // returns false when the form is readonly, after reporting it through `feedback`. Callers early-return
    // on false: throwing here rejected the promise of the `async` handler that called it, which is exactly
    // the unhandled rejection `@submit.prevent="handleSubmit"` used to log — a throw before the first
    // `await` is still a rejected promise, never a synchronous throw.
    function checkReadonly(): boolean {
        if (readonly()) {
            feedback.fail("Readonly")
            return false
        }
        return true
    }

    // the text a non-400 failure carries: a ProblemDetails `detail` (409) or a plain `{ message }` body — also when the
    // body lists field errors, which only a 400 shows — else the request's own message
    const serverMessage = (error: any): string => {
        const data = error?.response?.data
        return [data?.detail, data?.message].find((t): t is string => typeof t === "string" && t !== "") ?? error?.message
    }

    async function handleSubmit(): Promise<void> {
        if (!checkReadonly()) {
            return
        }

        emit("changeState", FormStates.pending)
        let result: Awaited<ReturnType<typeof service.save>>
        try {
            failure.value = undefined
            feedback.pending("Saving...")
            result = await service.save(item.value)
        } catch (ex) {
            console.error("Saving failed", { ex })
            const error = ex as any
            failure.value = toFailure(error)
            // a rejection may carry no reason at all
            const status = error?.response?.status
            if (status == 400) {
                feedback.fail("Saving failed", toFeedbackError(error))
            } else if (status == 404) {
                feedback.fail("Item not found", serverMessage(error))
            } else if (status < 500) {
                // the server refused the write (409 conflict, 403): no fault of its own
                feedback.fail("Saving failed", serverMessage(error))
            } else {
                feedback.fail("Server error", serverMessage(error))
            }
            emit("changeState", FormStates.error)
            // no re-throw: feedback surfaces the error, and `save` only emits on success (below), so a
            // consumer that navigates/closes on @save correctly does nothing on failure. Re-throwing left
            // `@submit.prevent="handleSubmit"` — the binding the scaffold generates — logging an unhandled
            // rejection on every failed save. Validate before calling it; branch on `feedback` after.
            return
        }

        // the server took the write: what fails from here on is no refusal of it — logged, and the write still ends `saved`
        const { saved, isNew } = result
        try {
            // first: a listener that throws — re-thrown from emit in a dev build — must not leave the form pending
            feedback.success("Saved")
            emit("save", { saved, isNew })
            item.value = service.toEntity(deepCopy(saved))
            original.value = service.toEntity(deepCopy(saved))
            emit("update:modelValue", item.value)
            if (isNew && !isPopup()) {
                navigateAfterInsert(saved)
            }
        } catch (ex) {
            console.error("Saved, but the form could not take the answer", { ex })
        } finally {
            emit("changeState", FormStates.saved)
        }
    }

    async function handleRemove(): Promise<void> {
        if (!checkReadonly()) {
            return
        }

        emit("changeState", FormStates.pending)
        try {
            failure.value = undefined
            feedback.pending("Deleting...")
            await service.remove(item.value as T)
            feedback.success("Deleted")
            emit("remove", item.value as T)
            emit("changeState", FormStates.removed)
        } catch (ex) {
            console.error("Deleting failed", { item, ex })
            const error = ex as any
            failure.value = toFailure(error)
            const status = error?.response?.status
            if (status == 400) {
                feedback.fail("Deleting failed", toFeedbackError(error))
            } else if (status == 404) {
                feedback.fail("Item not found", serverMessage(error))
            } else {
                // 409/500 etc. — surface the server's message (e.g. an FK-constraint "still referenced" reason)
                feedback.fail("Deleting failed", serverMessage(error))
            }
            emit("changeState", FormStates.error)
            // no re-throw: feedback surfaces the error, and `remove` only emits on success (above), so a
            // consumer that navigates/closes on @remove correctly does nothing on failure. Re-throwing here
            // only produced an unhandled-rejection warning from the delete button's event handler.
        }
    }

    async function handleRestore(): Promise<void> {
        // un-archiving is a write, so it answers to `readonly` exactly like submit and remove
        if (!checkReadonly()) {
            return
        }

        const restoringItem = service.toEntity(deepCopy(item.value)) as unknown as IArchivable
        restoringItem.isArchived = false

        emit("changeState", FormStates.pending)
        let result: Awaited<ReturnType<typeof service.save>>
        try {
            failure.value = undefined
            feedback.pending("Restoring...")
            result = await service.save(restoringItem)
        } catch (ex) {
            console.error("Restoring failed", { item, ex })
            const error = ex as any
            failure.value = toFailure(error)
            feedback.fail("Restoring failed", toFeedbackError(error))
            emit("changeState", FormStates.error)
            // no re-throw — same reasoning as handleSubmit/handleRemove above
            return
        }

        // the server took the write, as in handleSubmit
        const { saved, isNew } = result
        try {
            feedback.success("Restored")
            emit("restore", saved)
            emit("save", { saved, isNew })
            item.value = service.toEntity(deepCopy(saved))
            original.value = service.toEntity(deepCopy(saved))
            emit("update:modelValue", item.value)
        } catch (ex) {
            console.error("Restored, but the form could not take the answer", { ex })
        } finally {
            emit("changeState", FormStates.saved)
        }
    }

    return {
        item,
        original,
        feedback,
        failure,
        handleCancel,
        handleSubmit,
        handleRemove,
        handleRestore,
        mount() {
            original.value = service.toEntity(deepCopy(item.value))
        },
        onModelValueChange(value) {
            item.value = value
            original.value = service.toEntity(deepCopy(item.value))
            failure.value = undefined
        },
    }
}
