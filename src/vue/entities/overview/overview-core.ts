import { useFeedback } from "../../ui/feedback"
import { vueBox } from "../../box"
import type { IEntity, ISearchObject } from "../../../core/entities/abstractions"
import { createOverviewCore } from "../../../core/entities/overview/overview-core"
import type { OverviewCoreIn, OverviewCoreInternals, OverviewCoreOut } from "./overview"

export function useOverviewCore<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize,
}: OverviewCoreIn<T, SO>): OverviewCoreOut<T, SO> & OverviewCoreInternals {
    // every box is a ref and the feedback is useFeedback's reactive object, so the controller is the composable's output
    return createOverviewCore({ box: vueBox, service, searchObject, defaultPageSize, feedback: useFeedback() }) as unknown as OverviewCoreOut<T, SO> &
        OverviewCoreInternals
}

export default useOverviewCore
