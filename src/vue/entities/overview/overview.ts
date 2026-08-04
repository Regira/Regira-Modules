import type { IPagingInfo, IEntity, IConfig, ISearchObject, IEntityService, SaveResult } from "../abstractions"
import type { FeedbackOut, FeedbackError } from "../../ui/feedback"
import type { Ref } from "vue"

export const DEFAULT_DEBOUNCE = 250

export interface OverviewEmits<T extends IEntity, SO extends ISearchObject = ISearchObject> {
    "update:modelValue": [Array<T>]
    "update:searchObject": [SO]
    "update:pagingInfo": [IPagingInfo]
    save: [SaveResult<T>]
    remove: [T]
    "request-save": [T]
    "request-remove": [T]
}

export interface OverviewProps<T extends IEntity> {
    modelValue: Array<T>
    config: IConfig
    title: string
    service: IEntityService<T>
}

export type OverviewError = { response: { data?: { errors: FeedbackError } } }

export type OverviewCoreIn<T extends IEntity, SO extends ISearchObject = ISearchObject> = {
    service: IEntityService<T>
    searchObject: SO
    defaultPageSize?: number
}
export type OverviewCoreOut<T extends IEntity, SO extends ISearchObject = ISearchObject> = {
    searchObject: Ref<SO>
    pagingInfo: Ref<IPagingInfo>
    items: Ref<Array<T> | undefined>
    itemsCount: Ref<number | undefined>

    isLoading: Ref<boolean>
    feedback: FeedbackOut

    applySave(item: T): Promise<SaveResult<T> | undefined>
    /** `false` when the server refused the delete (409, 403, …) — guard `handleRemove` on it, or a failed delete still drops the row from the list. */
    applyRemove(item: T): Promise<boolean>
    handleSave({ saved, isNew }: SaveResult<T>): void
    handleRemove(item: T): void
    resetPage(): void
}

export interface IListViewIn<T extends IEntity, SO extends ISearchObject = ISearchObject> extends OverviewCoreIn<T, SO> {
    debounceDelay?: number
}
export interface IListViewOut<T extends IEntity, SO extends ISearchObject = ISearchObject> extends OverviewCoreOut<T, SO> {
    listHandler(): Promise<void>
    debouncedListHandler(): Promise<void>
}

export interface ISearchViewOut<T extends IEntity, SO extends ISearchObject = ISearchObject> extends OverviewCoreOut<T, SO> {
    searchHandler(resetPaging?: boolean): Promise<void>
    debouncedSearchHandler(): Promise<void>
}
