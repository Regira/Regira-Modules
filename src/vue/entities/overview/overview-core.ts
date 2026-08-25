import { useFeedback } from "../../ui"
import { ref, type Ref } from "vue"
import { DEFAULT_PAGESIZE, PagingInfo, type IEntity, type IPagingInfo, type ISearchObject, type SaveResult } from "../abstractions"
import type { OverviewCoreIn, OverviewCoreInternals, OverviewCoreOut, OverviewError } from "./overview"

export function useOverviewCore<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
}: OverviewCoreIn<T, SO>): OverviewCoreOut<T, SO> & OverviewCoreInternals {
    const searchObjectRef = ref<SO>(searchObject) as Ref<SO>
    const pagingInfo = ref<IPagingInfo>(new PagingInfo(defaultPageSize || DEFAULT_PAGESIZE))
    const itemsCount = ref<number | undefined>()
    const items = ref<Array<T> | undefined>()
    const isLoading = ref<boolean>(false)
    const feedback = useFeedback()

    // One "newest wins" counter for everything that writes the shared `isLoading`/`feedback` — the fetch
    // handlers of `useSearchView`/`useListView` and the writes below alike. They overlap in both directions:
    // a save started from a row settles while a filter change is still fetching, and its ungated
    // `isLoading = false` would clear the spinner the fetch still owns (and its banner sit over the fetch's).
    // Only the shared state is gated; the caller's own return value is always delivered, so `handleSave` /
    // `handleRemove` still apply to the list whatever else is in flight.
    let latestWriteId = 0
    function claimWrite() {
        const writeId = ++latestWriteId
        return () => writeId === latestWriteId
    }

    async function applySave(item: T): Promise<SaveResult<T> | undefined> {
        const isLatest = claimWrite()
        isLoading.value = true
        try {
            feedback.reset()
            const { saved, isNew } = await service.save(item)
            if (isLatest()) feedback.success(`Saved ${item.$title}`)
            return { saved, isNew }
        } catch (ex: unknown) {
            console.error("saving failed", { ex, item })
            // a superseded save still reports to the console, but its banner would sit over a newer result
            if (isLatest()) {
                const error = ex as OverviewError
                feedback.fail(`Saving ${item.$title} failed`, error.response?.data?.errors)
            }
        } finally {
            // a superseded save leaves the spinner to the call that replaced it
            if (isLatest()) isLoading.value = false
        }
        return undefined
    }
    // Returns whether the row is gone, so a caller can guard handleRemove the way applySave's result already
    // lets it guard handleSave. A delete the server refused (409 while the row is referenced, 403) used to
    // leave the failure message up AND drop the row from the list until the next fetch.
    async function applyRemove(item: T): Promise<boolean> {
        const isLatest = claimWrite()
        isLoading.value = true
        try {
            feedback.reset()
            await service.remove(item)
            return true
        } catch (ex) {
            console.error("removing failed", { ex, item })
            // a superseded delete still reports to the console, but its banner would sit over a newer result
            if (isLatest()) {
                const error = ex as OverviewError
                feedback.fail(`Removing ${item.$title} failed`, error.response?.data?.errors)
            }
        } finally {
            // a superseded delete leaves the spinner to the call that replaced it
            if (isLatest()) isLoading.value = false
        }
        return false
    }
    function handleSave({ saved, isNew }: SaveResult<T>) {
        if (items.value == null) {
            return
        }

        if (!isNew) {
            const index = items.value.findIndex((x) => x.$id === saved.$id)
            if (index !== -1) {
                items.value.splice(index, 1, saved)
            }
        } else {
            items.value.push(saved)
        }
    }
    function handleRemove(item: T): void {
        if (items.value == null) {
            return
        }

        const index = items.value.findIndex((x) => x.$id === item.$id)
        if (index !== -1) {
            items.value.splice(index, 1)
        }
    }
    function resetPage() {
        pagingInfo.value = {
            ...pagingInfo?.value,
            page: 1,
        }
    }

    return {
        searchObject: searchObjectRef,
        pagingInfo,
        items,
        itemsCount,

        isLoading,
        feedback,

        applySave,
        applyRemove,
        handleSave,
        handleRemove,

        resetPage,

        claimWrite,
    }
}

export default useOverviewCore
