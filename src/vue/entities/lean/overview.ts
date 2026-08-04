import { ref, computed, onMounted, type Ref, type ComputedRef } from "vue"
import { DEFAULT_PAGESIZE } from "../abstractions"
import type { IEntity, IEntityService } from "../abstractions"

export type LeanOverviewProps<T extends IEntity> = {
    service: IEntityService<T>
    query?: Record<string, unknown>
    pageSize?: number
}
export const leanOverviewDefaults = {
    pageSize: DEFAULT_PAGESIZE,
}
export type LeanOverviewSlots<T extends IEntity> = {
    toolbar?(props: { reload: () => Promise<void>; setPage: (p: number) => Promise<void> }): any
    head?(): any
    row?(props: { item: T; remove: (item: T) => Promise<void>; reload: () => Promise<void> }): any
    paging?(props: { page: number; pageCount: number; count: number; setPage: (p: number) => Promise<void> }): any
}
export type LeanOverviewOut<T extends IEntity> = {
    items: Ref<Array<T>>
    count: Ref<number>
    page: Ref<number>
    pageCount: ComputedRef<number>
    reload(): Promise<void>
    setPage(page: number): Promise<void>
    remove(item: T): Promise<void>
}

/** search/paging/remove behavior of the lean overview; reloads on mount */
export function useLeanOverview<T extends IEntity>(props: LeanOverviewProps<T>): LeanOverviewOut<T> {
    const items = ref([]) as Ref<Array<T>>
    const count = ref(0)
    const page = ref(1)
    const pageSize = computed(() => props.pageSize ?? DEFAULT_PAGESIZE)
    const pageCount = computed(() => Math.max(1, Math.ceil(count.value / pageSize.value)))

    async function reload(): Promise<void> {
        const result = await props.service.search({ ...props.query, page: page.value, pageSize: pageSize.value })
        items.value = result.items
        count.value = result.count
    }
    async function setPage(p: number): Promise<void> {
        page.value = Math.min(Math.max(1, p), pageCount.value)
        await reload()
    }
    async function remove(item: T): Promise<void> {
        await props.service.remove(item)
        await reload()
    }

    onMounted(reload)

    return { items, count, page, pageCount, reload, setPage, remove }
}
