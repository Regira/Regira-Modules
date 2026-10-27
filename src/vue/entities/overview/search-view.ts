import { computed, ref } from "vue"
import { debounceToPromise } from "../../../utilities/promise-utility"
import { DEFAULT_PAGESIZE, type IEntity, type ISearchObject } from "../abstractions"
import { DEFAULT_DEBOUNCE, type ISearchViewIn, type ISearchViewOut } from "./overview"
import { toFeedbackError } from "../../ui/feedback"
import useOverviewCore from "./overview-core"

export function useSearchView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
    debounceDelay = DEFAULT_DEBOUNCE,
    append = false,
}: ISearchViewIn<T, SO>): ISearchViewOut<T, SO> {
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

    const pageSizeOf = () => pagingInfo.value?.pageSize || 0
    const appending = () => append && pageSizeOf() > 0
    // append mode: each search starts the list over, so a page that settles after one must not land on it
    let searchGeneration = 0
    let searching = false
    // append mode: the server pages the rows on screen came from (1..lastPage). A row the screen keeps after the
    // server dropped it, or adds itself, does not count, so the next page is always the server's own.
    const lastPage = ref(0)
    // append mode: the server's own count, which handleSave/handleRemove leave alone (itemsCount follows the screen)
    const serverCount = ref(0)

    /** rows of `data` whose $id is not on screen yet */
    function notShown(data: Array<T>) {
        const shown = new Set((items.value ?? []).map((x) => x.$id).filter((id) => id != null))
        return data.filter((x) => x.$id == null || !shown.has(x.$id))
    }

    // Only the newest search may write. Two are genuinely in flight whenever a second starts before the
    // first settles — `useRouteOverview` fetches on mount while the slice's login/refresh reload hook
    // searches again, and a filter change or fast paging does the same — and without this the one that
    // settles LAST wins. The bad ordering is the common one: the earlier fetch 401s and lands after the
    // later one succeeded, so `feedback.fail` (which does not auto-hide, unlike `success`) paints an error
    // banner over data that is already on screen. The rows are this search's own to write until a newer search
    // starts (`searchGeneration`): a save in the meantime must not drop them, or the previous filter's rows stay.
    // The spinner and the banner go by the core's counter, shared with `applySave`/`applyRemove` — a save
    // settling mid-search must not clear the spinner this one owns.
    async function searchHandler(resetPaging = false): Promise<void> {
        const isLatest = claimWrite()
        const generation = ++searchGeneration
        searching = true
        isLoading.value = true
        try {
            feedback.reset()
            const so = { ...(searchObjectRef.value || {}), ...(pagingInfo.value || {}) }
            if (appending()) {
                // A reset starts over at one page. A refresh fetches every page on screen again, one request per
                // page (the API caps a request at its MaxPageSize), so the list keeps its length and its place.
                const pageSize = pageSizeOf()
                const pages = resetPaging ? 1 : Math.max(1, lastPage.value)
                const data: Array<T> = []
                let count = 0
                let fetched = 0
                while (fetched < pages) {
                    const result = await service.search({ ...so, page: ++fetched, pageSize })
                    if (generation !== searchGeneration) return
                    const ids = new Set(data.map((x) => x.$id))
                    data.push(...result.items.filter((x) => x.$id == null || !ids.has(x.$id)))
                    count = result.count
                    if (result.items.length < pageSize) break
                }
                items.value = data
                itemsCount.value = serverCount.value = count
                lastPage.value = fetched
                return
            }
            if (resetPaging) {
                so.page = 1
            }
            const { items: data, count } = await service.search(so)
            if (generation !== searchGeneration) return
            items.value = data
            itemsCount.value = count
        } catch (ex) {
            console.error("fetching failed", { ex })
            // a superseded search still reports to the console, but its banner would sit over a newer result
            if (isLatest()) {
                feedback.fail("fetching data failed", toFeedbackError(ex) ?? (ex as Error | undefined)?.message)
            }
        } finally {
            if (generation === searchGeneration) searching = false
            // a superseded search leaves the spinner to the one that replaced it
            if (isLatest()) isLoading.value = false
        }
    }
    const debouncedSearchHandler = debounceToPromise(
        searchHandler as (...args: unknown[]) => Promise<void>,
        debounceDelay
    ) as unknown as () => Promise<void>

    const hasMore = computed(() => appending() && lastPage.value > 0 && lastPage.value * pageSizeOf() < serverCount.value)

    let pending: { generation: number; promise: Promise<void> } | undefined
    function loadMore(): Promise<void> {
        // a search in flight is about to replace the list, so there is nothing to add to yet
        if (searching || !hasMore.value) return Promise.resolve()
        // a second call joins the fetch for this list, never one for a list a search has replaced since
        if (pending?.generation === searchGeneration) return pending.promise
        const generation = searchGeneration
        const promise: Promise<void> = fetchMore(generation).finally(() => {
            if (pending?.promise === promise) pending = undefined
        })
        pending = { generation, promise }
        return promise
    }
    async function fetchMore(generation: number): Promise<void> {
        const isLatest = claimWrite()
        isLoading.value = true
        try {
            feedback.reset()
            // The last page again, then the next one. A row that left the server's result since (deleted, or edited
            // out of the filter while the screen keeps it) moves the rows behind it up into the last page, where
            // they are picked up; a row that moved down is already on screen and is dropped by its $id.
            for (const page of [lastPage.value, lastPage.value + 1]) {
                const { items: data, count } = await service.search({
                    ...(searchObjectRef.value || {}),
                    ...pagingInfo.value,
                    page,
                    pageSize: pageSizeOf(),
                })
                if (generation !== searchGeneration) return
                const fresh = notShown(data)
                if (items.value) items.value.push(...fresh)
                else items.value = fresh
                itemsCount.value = serverCount.value = count
            }
            lastPage.value++
        } catch (ex) {
            console.error("fetching failed", { ex })
            if (isLatest()) {
                feedback.fail("fetching data failed", toFeedbackError(ex) ?? (ex as Error | undefined)?.message)
            }
        } finally {
            if (isLatest()) isLoading.value = false
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
        searchHandler,
        debouncedSearchHandler,
        loadMore,
        hasMore,
    }
}

export default useSearchView
