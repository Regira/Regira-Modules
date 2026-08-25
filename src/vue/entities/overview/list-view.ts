import { debounceToPromise } from "../../../utilities/promise-utility"
import { DEFAULT_PAGESIZE, type IEntity, type ISearchObject } from "../abstractions"
import { DEFAULT_DEBOUNCE, type IListViewIn, type IListViewOut, type OverviewError } from "./overview"
import { useOverviewCore } from "./overview-core"

export function useListView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
    debounceDelay = DEFAULT_DEBOUNCE,
}: IListViewIn<T, SO>): IListViewOut<T, SO> {
    const {
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
    } = useOverviewCore({ service, searchObject, defaultPageSize })

    // Only the newest list may write — the same reasoning as `useSearchView`'s `searchHandler`: a second
    // call starts before the first settles (a filter change, fast paging, or the slice's login/refresh
    // reload hook firing over a mount fetch), and the one that settles last would otherwise win, up to
    // painting a 401's banner (`fail()` does not auto-hide) over rows already on screen. The counter is the
    // core's, shared with `applySave`/`applyRemove` — a save settling mid-fetch must not clear this spinner.
    async function listHandler(): Promise<void> {
        const isLatest = claimWrite()
        isLoading.value = true
        try {
            feedback.reset()
            // the REF, not the `searchObject` argument still in scope — that one is only the initial value,
            // while the ref is what the view mutates. `.value` on the argument type-checks (`ISearchObject`
            // extends `Record<string, any>`) and reads undefined, which silently sends paging alone.
            const data = await service.list({ ...(searchObjectRef.value || {}), ...(pagingInfo.value || {}) })
            if (!isLatest()) return
            items.value = data
            itemsCount.value = data.length
        } catch (ex) {
            console.error("fetching failed", { ex })
            // a superseded list still reports to the console, but its banner would sit over a newer result
            if (isLatest()) {
                const error = ex as OverviewError
                feedback.fail("fetching data failed", error.response?.data?.errors)
            }
        } finally {
            // a superseded list leaves the spinner to the one that replaced it
            if (isLatest()) isLoading.value = false
        }
    }
    const debouncedListHandler = debounceToPromise(listHandler, debounceDelay) as unknown as () => Promise<void>

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

        listHandler,
        debouncedListHandler,
    }
}

export default useListView
