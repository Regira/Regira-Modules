import type { IEntity, ISearchObject } from "../../../core/entities/abstractions"
import { createListView } from "../../../core/entities/overview/list-view"
import type { IListViewIn, IListViewOut } from "./overview"
import { useFeedback } from "../../ui/feedback"
import { vueBox } from "../../box"

export function useListView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize,
    debounceDelay,
}: IListViewIn<T, SO>): IListViewOut<T, SO> {
    return createListView({ box: vueBox, service, searchObject, defaultPageSize, debounceDelay, feedback: useFeedback() }) as unknown as IListViewOut<
        T,
        SO
    >
}

export default useListView
