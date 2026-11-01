import type { Box, BoxFactory } from "../../box"
import type { FeedbackSink, FeedbackState } from "../../feedback/feedback"
import type { IEntity, IEntityService, IPagingInfo, ISearchObject, SaveResult } from "../abstractions"

export const DEFAULT_DEBOUNCE = 250

export type OverviewCoreInput<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState> = {
    box: BoxFactory
    service: IEntityService<T>
    /** the initial search object; the controller keeps it in the `searchObject` box, which the view writes */
    searchObject: SO
    defaultPageSize?: number
    /** where the controller reports; a feedback of its own when left out */
    feedback?: F
}
export type OverviewCore<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState> = {
    searchObject: Box<SO>
    pagingInfo: Box<IPagingInfo>
    items: Box<Array<T> | undefined>
    itemsCount: Box<number | undefined>

    isLoading: Box<boolean>
    feedback: F

    applySave(item: T): Promise<SaveResult<T> | undefined>
    /** `false` when the server refused the delete */
    applyRemove(item: T): Promise<boolean>
    handleSave({ saved, isNew }: SaveResult<T>): void
    handleRemove(item: T): void
    resetPage(): void
}
/** the "newest wins" gate the views built on the core share with it; not part of a view's output */
export type OverviewCoreInternals = {
    claimWrite(): () => boolean
}

export type ListViewInput<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState> = OverviewCoreInput<
    T,
    SO,
    F
> & {
    debounceDelay?: number
}
export type ListView<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState> = OverviewCore<T, SO, F> & {
    listHandler(): Promise<void>
    debouncedListHandler(): Promise<void>
}

export type SearchViewInput<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState> = ListViewInput<
    T,
    SO,
    F
> & {
    append?: boolean
}
export type SearchView<T extends IEntity, SO extends ISearchObject = ISearchObject, F extends FeedbackSink = FeedbackState> = OverviewCore<
    T,
    SO,
    F
> & {
    searchHandler(resetPaging?: boolean): Promise<void>
    debouncedSearchHandler(): Promise<void>
    loadMore(): Promise<void>
    /** `append` only: the server has rows past the pages fetched so far */
    hasMore(): boolean
}
