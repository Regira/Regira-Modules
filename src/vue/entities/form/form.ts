import { watch, onMounted, type Ref } from "vue"
import { useRouter, type RouteLocationRaw } from "vue-router"
import useFeedback, { type FeedbackOut } from "../../ui/feedback"
import type { IEntity } from "../../../core/entities/abstractions/IEntity"
import type { IEntityService, SaveResult } from "../../../core/entities/abstractions/IEntityService"
import { createForm, FormStates, type FormEvent } from "../../../core/entities/form/form"
import { vueBox } from "../../box"

export { FormStates } from "../../../core/entities/form/form"
export interface FormEmits<T extends IEntity> {
    (e: "update:modelValue", item?: T): void
    (e: "save", result: SaveResult<T>): void
    (e: "remove", item: T): void
    (e: "restore", item: T): void
    (e: "cancel", arg: { canceled: T; original?: T }): void
    (e: "changeState", state: FormStates): void
}
export interface FormProps<T extends IEntity> {
    modelValue: T
    readonly?: boolean
    isPopup?: boolean
}
export const formDefaults = {
    // no defaults
    readonly: false,
    isPopup: false,
}

export interface FormIn<T extends IEntity> {
    entityService: IEntityService<T>
    props: {
        modelValue: T
        readonly?: boolean
        isPopup?: boolean
    }
    emit: FormEmits<T>
    feedback?: FeedbackOut
    /**
     * where an insert goes once it is saved, in place of the form's own route with the new id, e.g.
     * `(saved) => ({ name: "TicketConversation", params: { id: saved.$id } })`. It replaces the current route, as the
     * default does, so Back skips the emptied `/new` form; not used when `props.isPopup` is set. A `@save` handler
     * cannot navigate instead: the form's own route replace, which runs after the emit, cancels it.
     */
    afterInsertRoute?: (saved: T) => RouteLocationRaw
}
export interface FormOut<T extends IEntity> {
    item: Ref<T>
    original?: Ref<T>
    feedback: FeedbackOut
    /**
     * the last write the server refused or that failed: its HTTP status (none for a network failure) and the
     * ProblemDetails `title`; `undefined` once the next write starts or a new `modelValue` arrives. A 409 titled
     * `"Concurrency conflict"` is a stale concurrency token (offer a reload), one titled `"Conflict"` a constraint.
     */
    failure: Ref<{ status?: number; title?: string } | undefined>
    handleCancel(): void
    handleSubmit(): Promise<void>
    handleRemove(): Promise<void>
    handleRestore(): Promise<void>
}

// FormContainer
export function useForm<T extends IEntity>({ entityService, props, emit, feedback = useFeedback(), afterInsertRoute }: FormIn<T>): FormOut<T> {
    const router = useRouter()
    // the current route with the new id: query and hash kept, `src` dropped
    function toSavedRoute(saved: T): RouteLocationRaw {
        const currentRoute = router.currentRoute.value
        delete currentRoute.query.src
        return {
            name: currentRoute.name!,
            params: {
                ...currentRoute.params,
                id: saved.$id,
            },
            query: {
                ...currentRoute.query,
            },
            hash: currentRoute.hash,
        }
    }

    // the writes, their states and their failures are the core's; the route after an insert reads vue-router's shape
    const form = createForm<T, FeedbackOut>({
        box: vueBox,
        service: entityService,
        // `readonly` and `isPopup` are read when a handler runs, never destructured: a permission-gated form mounts
        // before the stored token is restored, and a snapshot would keep it locked after access resolves
        modelValue: () => props.modelValue,
        readonly: () => !!props.readonly,
        isPopup: () => !!props.isPopup,
        emit: (...event: FormEvent<T>) => (emit as (...args: unknown[]) => void)(...event),
        navigateAfterInsert: (saved) => router.replace(afterInsertRoute ? afterInsertRoute(saved) : toSavedRoute(saved)),
        feedback,
    })

    watch(() => props.modelValue, form.onModelValueChange)
    onMounted(form.mount)

    return {
        item: form.item as Ref<T>,
        original: form.original as Ref<T>,
        feedback,
        failure: form.failure as Ref<{ status?: number; title?: string } | undefined>,
        handleCancel: form.handleCancel,
        handleSubmit: form.handleSubmit,
        handleRemove: form.handleRemove,
        handleRestore: form.handleRestore,
    }
}
