import { createFeedback, type FeedbackSink, type FeedbackState } from "../../feedback/feedback"
import { feedbackText, toFeedbackError } from "../../feedback/errors"
import { feedbackTexts } from "../feedback-texts"
import { DEFAULT_PAGESIZE, PagingInfo, type IEntity, type IPagingInfo, type ISearchObject, type SaveResult } from "../abstractions"
import type { OverviewCore, OverviewCoreInput, OverviewCoreInternals } from "./types"

export function createOverviewCore<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState>({
    box,
    service,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
    feedback: sink,
}: OverviewCoreInput<T, SO, F>): OverviewCore<T, SO, F> & OverviewCoreInternals {
    const searchObjectBox = box<SO>(searchObject)
    const pagingInfo = box<IPagingInfo>(new PagingInfo(defaultPageSize || DEFAULT_PAGESIZE))
    const itemsCount = box<number | undefined>(undefined)
    const items = box<Array<T> | undefined>(undefined)
    const isLoading = box<boolean>(false)
    const feedback = sink ?? (createFeedback({ box }) as FeedbackSink as F)

    // One "newest wins" counter for everything that writes the shared `isLoading`/`feedback` — the fetch
    // handlers of the search and list views and the writes below alike. They overlap in both directions:
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
            if (isLatest()) feedback.success(feedbackText(feedbackTexts.savedTitle, { title: item.$title }))
            return { saved, isNew }
        } catch (ex: unknown) {
            console.error("saving failed", { ex, item })
            // a superseded save still reports to the console, but its banner would sit over a newer result
            if (isLatest()) {
                feedback.fail(
                    feedbackText(feedbackTexts.savingTitleFailed, { title: item.$title }),
                    toFeedbackError(ex) ?? (ex as Error | undefined)?.message
                )
            }
        } finally {
            // a superseded save leaves the spinner to the call that replaced it
            if (isLatest()) isLoading.value = false
        }
        return undefined
    }
    // Returns whether the row is gone, so a caller can guard handleRemove the way applySave's result already
    // lets it guard handleSave. A delete the server refused (a validator's 400, a 409 while the row is referenced, 403)
    // would otherwise leave the failure message up AND drop the row from the list until the next fetch.
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
                feedback.fail(
                    feedbackText(feedbackTexts.removingTitleFailed, { title: item.$title }),
                    toFeedbackError(ex) ?? (ex as Error | undefined)?.message
                )
            }
        } finally {
            // a superseded delete leaves the spinner to the call that replaced it
            if (isLatest()) isLoading.value = false
        }
        return false
    }
    // `itemsCount` moves with the rows: it is the total the list stands for (the server's count across pages for
    // the search view, the rows' own length for the list view), and the result count and the paging read it.
    // Both assign a new array, so a box only has to notice assignments.
    function handleSave({ saved, isNew }: SaveResult<T>) {
        const list = items.value
        if (list == null) {
            return
        }

        // a new row a fetch that settled after the save already brought is replaced, not added and counted twice
        const index = list.findIndex((x) => x.$id === saved.$id)
        if (index !== -1) {
            items.value = [...list.slice(0, index), saved, ...list.slice(index + 1)]
        } else if (isNew) {
            items.value = [...list, saved]
            if (itemsCount.value != null) itemsCount.value++
        }
    }
    function handleRemove(item: T): void {
        const list = items.value
        if (list == null) {
            return
        }

        const index = list.findIndex((x) => x.$id === item.$id)
        if (index !== -1) {
            items.value = [...list.slice(0, index), ...list.slice(index + 1)]
            if (itemsCount.value != null) itemsCount.value = Math.max(0, itemsCount.value - 1)
        }
    }
    function resetPage() {
        pagingInfo.value = {
            ...pagingInfo?.value,
            page: 1,
        }
    }

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

        claimWrite,
    }
}
