import { computed, watch, onMounted, type Ref, type ComputedRef } from "vue"
import { useRouter, type RouteRecordRaw } from "vue-router"
import { useFeedback, type FeedbackOut } from "../../ui/feedback"
import type { IEntity } from "../../../core/entities/abstractions/IEntity"
import type { IEntityService } from "../../../core/entities/abstractions/IEntityService"
import { createDetails, isOtherItem } from "../../../core/entities/details/details"
import { vueBox } from "../../box"

export type DetailsOut<T extends IEntity> = {
    item: Ref<T | undefined>
    routeId: ComputedRef<string>
    isNew: ComputedRef<boolean>

    overviewUrl?: RouteRecordRaw | string
    isForm: ComputedRef<boolean>
    isFiche: ComputedRef<boolean>
    hasFiche: ComputedRef<boolean>

    isLoading: Ref<boolean>
    feedback: FeedbackOut

    load(): Promise<void>
}

export function useDetails<T extends IEntity>(entityService: IEntityService<T>, feedback = useFeedback()): DetailsOut<T> {
    const router = useRouter()
    const routeId = computed(() => router.currentRoute.value.params.id as string)
    // the load, its guards and its feedback are the core's; the values that read vue-router's shape stay here
    const details = createDetails<T, FeedbackOut>({ box: vueBox, service: entityService, routeId: () => routeId.value, feedback })
    const isNew = computed(details.isNew)
    const item = details.item as Ref<T | undefined>
    const isLoading = details.isLoading as Ref<boolean>

    function getOverviewUrl() {
        function isOverviewUrl(url?: string) {
            if (!url) {
                return false
            }

            // remove queryString
            const queryStartLocation = url.indexOf("?")
            if (queryStartLocation > -1) {
                url = url.substring(0, queryStartLocation)
            }
            return router.options.routes.some((r) => r.path == url && r.name?.toString().includes("Overview"))
        }
        function getDefaultOverviewRoute() {
            const currentRoute = router.currentRoute.value
            return router.options.routes.find((r) => r.name == currentRoute.name?.toString().replace(/Form|Fiche/, "Overview"))
        }

        const prevUrl = router.options.history.state.back?.toString()
        const isPrevUrlOverview = isOverviewUrl(prevUrl)

        return isPrevUrlOverview ? prevUrl : getDefaultOverviewRoute()
    }

    const overviewUrl = getOverviewUrl()
    const isForm = computed(() => !!router.currentRoute.value.name?.toString().includes("Form"))
    const isFiche = computed(() => !!router.currentRoute.value.name?.toString().includes("Fiche"))
    const hasFiche = computed(() =>
        router.options.routes
            .flatMap((r) => [r, ...(r.children || [])])
            .some((r) => r.name == router.currentRoute.value.name?.toString().replace("Form", "Fiche"))
    )

    watch(router.currentRoute, async (newRoute, oldRoute) => {
        if (isOtherItem({ name: newRoute.name, id: newRoute.params.id }, { name: oldRoute.name, id: oldRoute.params.id })) {
            await details.load()
        }
    })

    onMounted(details.load)

    return {
        item,
        routeId,
        isNew,

        overviewUrl,
        isForm,
        isFiche,
        hasFiche,

        isLoading,
        feedback,

        load: details.load,
    }
}

export default useDetails
