import { ref, onMounted, type Ref } from "vue"
import type { IEntity, IEntityService } from "../abstractions"

export type LeanFormProps<T extends IEntity> = {
    service: IEntityService<T>
    /** "new" loads a fresh entity; anything else loads details */
    id: string | number
}
export type LeanFormEmits<T extends IEntity> = {
    (e: "saved", item: T): void
    (e: "cancel"): void
}
export type LeanFormSlots<T extends IEntity> = {
    default?(props: { item: T }): any
}
export type LeanFormOut<T extends IEntity> = {
    item: Ref<T | undefined>
    saving: Ref<boolean>
    submit(): Promise<void>
}

/** load/save behavior of the lean form; loads on mount, guards against double-submits */
export function useLeanForm<T extends IEntity>(props: LeanFormProps<T>, { emit }: { emit: LeanFormEmits<T> }): LeanFormOut<T> {
    const item = ref() as Ref<T | undefined>
    const saving = ref(false)

    onMounted(async () => {
        item.value = props.id === "new" ? await props.service.newEntity() : ((await props.service.details(props.id)) ?? undefined)
    })

    async function submit(): Promise<void> {
        if (!item.value) return
        saving.value = true
        try {
            const { saved } = await props.service.save(item.value)
            emit("saved", saved)
        } finally {
            saving.value = false
        }
    }

    return { item, saving, submit }
}
