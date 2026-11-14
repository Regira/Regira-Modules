import { debounceToPromise } from "../../../utilities/promise-utility"
import type { FeedbackSink, FeedbackState } from "../../feedback/feedback"
import { feedbackText, toFeedbackError } from "../../feedback/errors"
import { feedbackTexts } from "../feedback-texts"
import { DEFAULT_PAGESIZE, type IEntity, type ISearchObject } from "../abstractions"
import { createOverviewCore } from "./overview-core"
import { DEFAULT_DEBOUNCE, type ListView, type ListViewInput } from "./types"

export function createListView<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState>({
    box,
    service,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
    debounceDelay = DEFAULT_DEBOUNCE,
    feedback: sink,
}: ListViewInput<T, SO, F>): ListView<T, SO, F> {
    const {
        searchObject: searchObjectBox,
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
    } = createOverviewCore<T, SO, F>({ box, service, searchObject, defaultPageSize, feedback: sink })

    let listGeneration = 0

    // Only the newest list may write — the same reasoning as the search view's `searchHandler`: a second
    // call starts before the first settles (a filter change, fast paging, or the slice's login/refresh
    // reload hook firing over a mount fetch), and the one that settles last would otherwise win, up to
    // painting a 401's banner (`fail()` does not auto-hide) over rows already on screen. The rows are this
    // fetch's own to write until a newer one starts (`listGeneration`): a save in the meantime must not drop
    // them, or the previous filter's rows stay. The spinner and the banner go by the core's counter, shared
    // with `applySave`/`applyRemove` — a save settling mid-fetch must not clear this spinner.
    async function listHandler(): Promise<void> {
        const isLatest = claimWrite()
        const generation = ++listGeneration
        isLoading.value = true
        try {
            feedback.reset()
            // the BOX, not the `searchObject` argument still in scope — that one is only the initial value,
            // while the box is what the view writes. `.value` on the argument type-checks (`ISearchObject`
            // extends `Record<string, any>`) and reads undefined, which silently sends paging alone.
            const data = await service.list({ ...(searchObjectBox.value || {}), ...(pagingInfo.value || {}) })
            if (generation !== listGeneration) return
            items.value = data
            itemsCount.value = data.length
        } catch (ex) {
            console.error("fetching failed", { ex })
            // a superseded list still reports to the console, but its banner would sit over a newer result
            if (isLatest()) {
                feedback.fail(feedbackText(feedbackTexts.fetchingDataFailed), toFeedbackError(ex) ?? (ex as Error | undefined)?.message)
            }
        } finally {
            // a superseded list leaves the spinner to the one that replaced it
            if (isLatest()) isLoading.value = false
        }
    }
    const debouncedListHandler = debounceToPromise(listHandler, debounceDelay) as unknown as () => Promise<void>

    return {
        searchObject: searchObjectBox,
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
