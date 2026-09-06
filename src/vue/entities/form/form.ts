import { ref, watch, onMounted, type Ref } from "vue"
import { useRouter, type RouteLocationRaw } from "vue-router"
import { deepCopy } from "../../../utilities/object-utility"
import useFeedback, { type FeedbackOut } from "../../ui/feedback"
import type { IEntity } from "../abstractions/IEntity"
import type { IEntityService, SaveResult } from "../abstractions/IEntityService"

export enum FormStates {
    pending = "Pending",
    saved = "Saved",
    removed = "Removed",
    error = "Error",
}
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
}
export interface FormOut<T extends IEntity> {
    item: Ref<T>
    original?: Ref<T>
    feedback: FeedbackOut
    handleCancel(): void
    handleSubmit(): Promise<void>
    handleRemove(): Promise<void>
    handleRestore(): Promise<void>
}

// FormContainer
export function useForm<T extends IEntity>({ entityService, props, emit, feedback = useFeedback() }: FormIn<T>): FormOut<T> {
    type IArchivable = T & { isArchived: boolean }

    const { readonly, isPopup } = props
    // use ref instead of computed|useVModelField to preserve value when (re)loading from pool somewhere else
    //const item = ref(props.modelValue)
    const item = ref(props.modelValue) as Ref<T>

    const original = ref<T | undefined>() as Ref<T>

    function handleCancel(): void {
        emit("cancel", { canceled: item.value, original: original.value as T })
        // restore a fresh copy so `original` stays pristine and Cancel works on every click, not just the first
        item.value = entityService.toEntity(deepCopy(original.value))
    }

    // returns false when the form is readonly, after reporting it through `feedback`. Callers early-return
    // on false: throwing here rejected the promise of the `async` handler that called it, which is exactly
    // the unhandled rejection `@submit.prevent="handleSubmit"` used to log — a throw before the first
    // `await` is still a rejected promise, never a synchronous throw.
    function checkReadonly(): boolean {
        if (readonly) {
            feedback.fail("Readonly")
            return false
        }
        return true
    }

    const router = useRouter()
    async function handleSubmit(): Promise<void> {
        if (!checkReadonly()) {
            return
        }

        emit("changeState", FormStates.pending)
        try {
            feedback.pending("Saving...")
            const { saved, isNew } = await entityService.save(item.value)
            emit("save", { saved, isNew })
            feedback.success("Saved")
            item.value = entityService.toEntity(deepCopy(saved))
            original.value = entityService.toEntity(deepCopy(saved))
            emit("update:modelValue", item.value)
            if (isNew && !isPopup) {
                const currentRoute = router.currentRoute.value
                delete currentRoute.query.src
                const newRoute: RouteLocationRaw = {
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
                router.replace(newRoute)
            }
        } catch (ex) {
            console.error("Saving failed", { ex })
            const error = ex as any
            const status = error.response?.status
            if (status == 400) {
                feedback.fail("Saving failed", error.response?.data?.errors)
            } else if (status == 404) {
                feedback.fail("Item not found", error.response?.data?.message || error.message)
            } else {
                feedback.fail("Server error", error.response?.data?.message || error.message)
            }
            emit("changeState", FormStates.error)
            // no re-throw: feedback surfaces the error, and `save` only emits on success (above), so a
            // consumer that navigates/closes on @save correctly does nothing on failure. Re-throwing left
            // `@submit.prevent="handleSubmit"` — the binding the scaffold generates — logging an unhandled
            // rejection on every failed save. Validate before calling it; branch on `feedback` after.
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
            feedback.pending("Deleting...")
            await entityService.remove(item.value as T)
            feedback.success("Deleted")
            emit("remove", item.value as T)
        } catch (ex) {
            console.error("Deleting failed", { item, ex })
            const error = ex as any
            const status = error.response?.status
            if (status == 400) {
                feedback.fail("Deleting failed", error.response?.data?.errors)
            } else if (status == 404) {
                feedback.fail("Item not found", error.response?.data?.message || error.message)
            } else {
                // 409/500 etc. — surface the server's message (e.g. an FK-constraint "still referenced" reason)
                feedback.fail("Deleting failed", error.response?.data?.message || error.message)
            }
            emit("changeState", FormStates.error)
            // no re-throw: feedback surfaces the error, and `remove` only emits on success (above), so a
            // consumer that navigates/closes on @remove correctly does nothing on failure. Re-throwing here
            // only produced an unhandled-rejection warning from the delete button's event handler.
        } finally {
            emit("changeState", FormStates.removed)
        }
    }

    async function handleRestore(): Promise<void> {
        // un-archiving is a write, so it answers to `readonly` exactly like submit and remove
        if (!checkReadonly()) {
            return
        }

        const restoringItem = entityService.toEntity(deepCopy(item.value)) as unknown as IArchivable
        restoringItem.isArchived = false

        emit("changeState", FormStates.pending)
        try {
            feedback.pending("Restoring...")
            const { saved, isNew } = await entityService.save(restoringItem)
            emit("restore", saved)
            emit("save", { saved, isNew })
            feedback.success("Restored")
            item.value = entityService.toEntity(deepCopy(saved))
            original.value = entityService.toEntity(deepCopy(saved))
            emit("update:modelValue", item.value)
        } catch (ex) {
            console.error("Restoring failed", { item, ex })
            const error = ex as any
            feedback.fail("Restoring failed", error.response?.data?.errors)
            emit("changeState", FormStates.error)
            // no re-throw — same reasoning as handleSubmit/handleRemove above
        } finally {
            emit("changeState", FormStates.saved)
        }
    }

    watch(
        () => props.modelValue,
        () => {
            item.value = props.modelValue
            original.value = entityService.toEntity(deepCopy(item.value))
        }
    )
    onMounted(() => {
        original.value = entityService.toEntity(deepCopy(item.value))
    })
    // watchEffect(() => {
    //     original.value = entityService.toEntity(deepCopy(item.value))
    // })

    return {
        item,
        original,
        feedback,
        handleCancel,
        handleSubmit,
        handleRemove,
        handleRestore,
    }
}
