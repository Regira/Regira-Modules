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

    async function searchHandler(resetPaging = false): Promise<void> {
        isLoading.value = true
        try {
            feedback.reset()
            const so = { ...(searchObjectRef.value || {}), ...(pagingInfo.value || {}) }
            if (resetPaging) {
                so.page = 1
            }
            const { items: data, count } = await service.search(so)
            items.value = data
            itemsCount.value = count
        } catch (ex) {
            console.error("fetching failed", { ex })
            const error = ex as OverviewError
            feedback.fail("fetching data failed", error.response?.data?.errors)
        } finally {
            isLoading.value = false
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
