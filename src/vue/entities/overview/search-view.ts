import { debounceToPromise } from "../../../utilities/promise-utility"
import { DEFAULT_PAGESIZE, type IEntity, type ISearchObject } from "../abstractions"
import { DEFAULT_DEBOUNCE, type IListViewIn, type ISearchViewOut, type OverviewError } from "./overview"
import useOverviewCore from "./overview-core"

export function useSearchView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
    debounceDelay = DEFAULT_DEBOUNCE,
}: IListViewIn<T, SO>): ISearchViewOut<T, SO> {
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
    } = useOverviewCore({ service, searchObject, defaultPageSize })

    // Only the newest search may write. Two are genuinely in flight whenever a second starts before the
    // first settles — `useRouteOverview` fetches on mount while the slice's login/refresh reload hook
    // searches again, and a filter change or fast paging does the same — and without this the one that
    // settles LAST wins. The bad ordering is the common one: the earlier fetch 401s and lands after the
    // later one succeeded, so `feedback.fail` (which does not auto-hide, unlike `success`) paints an error
    // banner over data that is already on screen.
    let latestSearchId = 0
    async function searchHandler(resetPaging = false): Promise<void> {
        const searchId = ++latestSearchId
        isLoading.value = true
        try {
            feedback.reset()
            const so = { ...(searchObjectRef.value || {}), ...(pagingInfo.value || {}) }
            if (resetPaging) {
                so.page = 1
            }
            const { items: data, count } = await service.search(so)
            if (searchId !== latestSearchId) return
            items.value = data
            itemsCount.value = count
        } catch (ex) {
            console.error("fetching failed", { ex })
            // a superseded search still reports to the console, but its banner would sit over a newer result
            if (searchId === latestSearchId) {
                const error = ex as OverviewError
                feedback.fail("fetching data failed", error.response?.data?.errors)
            }
        } finally {
            // a superseded search leaves the spinner to the one that replaced it
            if (searchId === latestSearchId) isLoading.value = false
        }
    }
    const debouncedSearchHandler = debounceToPromise(
        searchHandler as (...args: unknown[]) => Promise<void>,
        debounceDelay
    ) as unknown as () => Promise<void>

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
        searchHandler,
        debouncedSearchHandler,
    }
}

export default useSearchView
