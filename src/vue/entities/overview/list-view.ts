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
    } = useOverviewCore({ service, searchObject, defaultPageSize })

    async function listHandler(): Promise<void> {
        isLoading.value = true
        try {
            feedback.reset()
            items.value = await service.list({ ...(searchObject.value || {}), ...(pagingInfo.value || {}) })
            itemsCount.value = items.value.length
        } catch (ex) {
            console.error("fetching failed", { ex })
            const error = ex as OverviewError
            feedback.fail("fetching data failed", error.response?.data?.errors)
        } finally {
            isLoading.value = false
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
