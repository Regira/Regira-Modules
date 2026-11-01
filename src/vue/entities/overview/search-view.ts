import { computed } from "vue"
import type { IEntity, ISearchObject } from "../../../core/entities/abstractions"
import { createSearchView } from "../../../core/entities/overview/search-view"
import type { ISearchViewIn, ISearchViewOut } from "./overview"
import { useFeedback } from "../../ui/feedback"
import { vueBox } from "../../box"

export function useSearchView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize,
    debounceDelay,
    append,
}: ISearchViewIn<T, SO>): ISearchViewOut<T, SO> {
    const view = createSearchView({ box: vueBox, service, searchObject, defaultPageSize, debounceDelay, append, feedback: useFeedback() })
    // the boxes are refs; the derived value is a function over them, which computed() tracks
    return { ...view, hasMore: computed(view.hasMore) } as unknown as ISearchViewOut<T, SO>
}

export default useSearchView
