import type { IConfig } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"

// Relative to the axios baseURL, and must equal the server's [Route(...)] exactly — repeating the base here
// sends requests to /api/api/... See entities.setup → The URL contract.
const api = "__api__"

const config: IConfig = {
    id: Entity.name,
    key: "__Entity__", // TODO: route-name prefix + icon key (conventionally = Entity.name)
    isComplex: true, // create/edit on a Details PAGE (default). Set false ONLY for a very basic entity — a few scalar
    //                  fields, no relations/tabs — that is fine to edit in a modal (FormModalButton). See entities.card → page vs modal.

    routePrefix: "__entities__", // TODO: URL path segment
    baseQueryParams: {}, // add includes ONLY for a COLLECTION the API gates behind its named [Flags] enum, e.g. { includes: ["Lines"] }; a to-one shown on every row belongs in the API's unconditional e.Includes instead
    initialQuery: {}, // route query for the GENERATED nav link ONLY — lost on refresh/deep-link. A default sortBy or includes belongs in baseQueryParams

    overviewTitle: "__entitiesKey__", // camelCase i18n keys (multi-word → e.g. shoppingLists / shoppingList) — add matching entries to public/data/translations.json, or the nav renders the raw key
    detailsTitle: "__entityKey__",
    description: "__entityKey__.description",
    icon: "bi bi-question-circle", // TODO: a Bootstrap-Icons class

    defaultPageSize: 10, // initial overview page size (raise it to show more per page, up to the server's MaxPageSize)

    api, // every *Url below defaults to `api` when omitted; keep only the ones you override
    searchUrl: api + "/search", // counted search endpoint — the overview pages through it (every controller exposes /search)
    saveUrl: api, // resource base — update/remove append /{$id} themselves
}

export default config
