import type { Box, BoxFactory } from "../../box"
import { createFeedback, type FeedbackSink, type FeedbackState } from "../../feedback/feedback"
import { feedbackText } from "../../feedback/errors"
import { feedbackTexts } from "../feedback-texts"
import type { IEntity } from "../abstractions/IEntity"
import type { IEntityService } from "../abstractions/IEntityService"
import { ArchivedFilter } from "../abstractions/ISearchObject"

export type DetailsInput<T extends IEntity, F extends FeedbackSink = FeedbackState> = {
    box: BoxFactory
    service: IEntityService<T>
    /** the route's id; `"new"` for an entity yet to be created */
    routeId(): string
    /** where the controller reports; a feedback of its own when left out */
    feedback?: F
}
export type Details<T extends IEntity, F extends FeedbackSink = FeedbackState> = {
    item: Box<T | undefined>
    isLoading: Box<boolean>
    feedback: F
    /** the route's id is `"new"` */
    isNew(): boolean
    /** loads the route's item, or a new one; the view calls it on mount and when the route moves to another id */
    load(): Promise<void>
}

/** what the details view needs of a route to know it moved: which page it is, and the id on it */
export type DetailsRoute = { name?: unknown; id?: unknown }

/** a navigation that loads again: the same page with another id — not from `new`, whose form became the saved item */
export function isOtherItem(next: DetailsRoute, previous: DetailsRoute): boolean {
    return next.name === previous.name && previous.id != "new" && next.id !== previous.id
}

export function createDetails<T extends IEntity, F extends FeedbackSink = FeedbackState>({
    box,
    service,
    routeId,
    feedback: sink,
}: DetailsInput<T, F>): Details<T, F> {
    const item = box<T | undefined>(undefined)
    const isLoading = box(false)
    const feedback = sink ?? (createFeedback({ box }) as FeedbackSink as F)
    const isNew = () => routeId() === "new"

    // Only the newest load may write — the same rule the search and list views follow. The retry described
    // below overlaps the load it retries whenever the first one has not settled yet, and the one that settles
    // LAST would otherwise win: the anonymous attempt's 401 lands after the retry succeeded and paints its
    // banner (`fail()` does not auto-hide) over an item that is already on screen.
    let latestLoadId = 0
    async function load() {
        const loadId = ++latestLoadId
        // A load starts from a clean slate: a details page typically fails once while anonymous (deep link,
        // token still being restored) and is retried after login, and without this the retry succeeds behind
        // the previous failure's banner — a correctly loaded page showing an error.
        feedback.reset()
        if (isNew()) {
            try {
                const created = await service.newEntity({})
                if (loadId !== latestLoadId) return
                item.value = created
            } finally {
                // Switching to `new` supersedes an in-flight detail fetch, whose guarded `finally` then
                // leaves the spinner to the load that replaced it — this one. Without clearing it here the
                // flag that fetch raised would never come down, and the spinner would sit on a loaded form.
                if (loadId === latestLoadId) isLoading.value = false
            }
            return
        }
        isLoading.value = true
        try {
            // archived-inclusive: the server 404s an archived row, and the form is the only surface that can
            // restore one. Row security (tenant/owner filters) is unaffected — this widens by the archived flag alone.
            const data = await service.details(routeId(), { archived: ArchivedFilter.included })
            if (loadId !== latestLoadId) return
            item.value = data
        } catch (ex: any) {
            console.error(`Fetching details failed for #${routeId()}`, { id: routeId(), ex })
            // a superseded load still reports to the console, but its banner would sit over a newer result
            if (loadId === latestLoadId) {
                // Optional chaining: a network/CORS failure carries no response, and reading through it here
                // throws out of the catch block — replacing the message with an unhandled rejection.
                const status = ex.response?.status
                feedback.fail(
                    feedbackText(feedbackTexts.fetchingItemFailed, { id: routeId() }),
                    status == 403
                        ? feedbackText(feedbackTexts.notAllowed)
                        : status == 404
                          ? feedbackText(feedbackTexts.notFound)
                          : ex.response?.data || ex.message
                )
            }
        } finally {
            // a superseded load leaves the spinner to the one that replaced it
            if (loadId === latestLoadId) isLoading.value = false
        }
    }

    return { item, isLoading, feedback, isNew, load }
}
