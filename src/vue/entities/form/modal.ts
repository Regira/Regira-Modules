import { deepCopy } from "../../../utilities/object-utility"
import { ref, unref, type Ref, getCurrentInstance } from "vue"
import { type FeedbackOut } from "../../ui"
import { ArchivedFilter, type IEntity, type IEntityService, type SaveResult, isNewEntity } from "../../entities/abstractions"
import type { FormEmits, FormProps } from "./form"

export interface FormModalEmits<T extends IEntity> extends FormEmits<T> {
    (e: "open", item: T, update: (newItem: T) => void): void
    (e: "close", item?: T): void
}
export interface FormModalProps<T extends IEntity> extends FormProps<T> {
    title?: string
    fullWidth?: boolean
    closeOnSave?: boolean
    closeOnDelete?: boolean
}
export const formModalDefaults = {
    closeOnSave: false,
    closeOnDelete: true,
}

interface FormModalIn<T extends IEntity> {
    entityService: IEntityService<T>
    model: Ref<T | undefined>
    itemDefaults?: Ref<Record<string, unknown>> | Record<string, unknown> | Ref<object> | ((item: T) => Promise<T>)
    closeOnSave?: boolean
    closeOnCancel?: boolean
    closeOnDelete?: boolean
    emit: FormModalEmits<T>
    feedback?: FeedbackOut
}
interface FormModalOut<T extends IEntity> {
    item: Ref<T>
    isOpen: Ref<boolean>
    feedback?: FeedbackOut
    close(): void
    open(): void
    handleSave({ saved, isNew }: SaveResult<T>): void
    handleRemove(): void
    handleCancel(e: { canceled: T; original?: T }): void
}

export function useModalForm<T extends IEntity>({
    entityService,
    model,
    itemDefaults,
    closeOnSave,
    closeOnCancel,
    closeOnDelete,
    emit,
    feedback,
}: FormModalIn<T>): FormModalOut<T> {
    const isOpen = ref(false)
    const item = ref<T>()
    const app = getCurrentInstance()

    function setItem(newItem: T) {
        item.value = newItem
    }
    function close() {
        emit("close", item.value)
        isOpen.value = false
    }
    async function open() {
        let itemValue = model.value
        try {
            const defaultValues = typeof itemDefaults !== "function" ? deepCopy(unref(itemDefaults) || {}) : {}
            if (itemValue == null) {
                itemValue = await entityService.newEntity(defaultValues)
            }
            if (!itemValue?.$id) {
                // make sure model is converted to an entity and $id is accessible
                itemValue = entityService.toEntity(itemValue || defaultValues)
            }
            if (entityService != null && !isNewEntity(itemValue.$id)) {
                // archived-inclusive like the details route — the hosted form carries the Restore button
                itemValue = (await entityService.details(itemValue.$id, { archived: ArchivedFilter.included })) || itemValue
            }
            if (typeof itemDefaults === "function") {
                const itemDefaultsFunc = itemDefaults as (item: T) => Promise<T>
                itemValue = await itemDefaultsFunc(itemValue)
            }
            item.value = itemValue
            isOpen.value = true
            emit("open", item.value, setItem)
        } catch (ex: any) {
            console.error("Fetching details failed", { id: itemValue?.$id, ex, app })
            feedback ||= app?.appContext.config.globalProperties.$feedback as FeedbackOut
            feedback.fail(
                `Fetching ${itemValue?.$title || "item #" + itemValue?.$id} failed`,
                ex.response.status == 403 ? "Not allowed" : ex.response?.data
            )
        }
    }
    function handleCancel(e: { canceled: T; original?: T }): void {
        if (closeOnCancel) {
            emit("cancel", e)
            close()
        }
    }
    function handleSave({ saved, isNew }: SaveResult<T>): void {
        emit("save", { saved, isNew })
        emit("update:modelValue", saved)
        if (closeOnSave) {
            close()
        }
    }
    function handleRemove() {
        emit("remove", item.value!)
        if (closeOnDelete) {
            close()
        }
    }

    return {
        item: item as Ref<T>,
        isOpen,

        feedback,

        close,
        open,

        handleSave,
        handleRemove,
        handleCancel,
    }
}
export const useModal = useModalForm
