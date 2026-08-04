import { ref, computed, watch, onMounted, type Ref, type ComputedRef } from "vue"
import { useRouter, type RouteRecordRaw } from "vue-router"
import { useFeedback, type FeedbackOut } from "../../ui/feedback"
import type { IEntity } from "../abstractions/IEntity"
import type { IEntityService } from "../abstractions/IEntityService"
import { ArchivedFilter } from "../abstractions/ISearchObject"

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
    const isNew = computed(() => routeId.value === "new")
    const item = ref<T | undefined>(undefined) as Ref<T | undefined>
    const isLoading = ref(false)

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

    async function setItem() {
        // A load starts from a clean slate: a details page typically fails once while anonymous (deep link,
        // token still being restored) and is retried after login, and without this the retry succeeds behind
        // the previous failure's banner — a correctly loaded page showing an error.
        feedback.reset()
        if (isNew.value) {
            item.value = await entityService.newEntity({})
            return
        }
        isLoading.value = true
        try {
            // archived-inclusive: the server 404s an archived row, and the form is the only surface that can
            // restore one. Row security (tenant/owner filters) is unaffected — this widens by the archived flag alone.
            item.value = await entityService.details(routeId.value, { archived: ArchivedFilter.included })
        } catch (ex: any) {
            console.error(`Fetching details failed for #${routeId.value}`, { id: routeId.value, ex })
            // Optional chaining: a network/CORS failure carries no response, and reading through it here
            // throws out of the catch block — replacing the message with an unhandled rejection.
            feedback.fail(
                `Fetching item #${routeId.value} failed`,
                ex.response?.status == 403 ? "Not allowed" : ex.response?.status == 404 ? "Not found" : ex.response?.data || ex.message
            )
        } finally {
            isLoading.value = false
        }
    }

    watch(router.currentRoute, async (newRoute, oldRoute) => {
        // only when staying on the same page
        if (newRoute.name === oldRoute.name && oldRoute.params.id != "new" && newRoute.params.id !== oldRoute.params.id) {
            await setItem()
        }
    })

    onMounted(setItem)

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

        load: setItem,
    }
}

export default useDetails
