/**
 * Visibility of archived (soft-deleted) rows — the `?archived=` query parameter.
 * Omitted from the request when unset, which leaves the server's default (`excluded`) in charge.
 */
export enum ArchivedFilter {
    /** archived rows are invisible — lists, counts and included collections alike */
    excluded = "excluded",
    /** archived rows only — the recycle-bin view */
    only = "only",
    /** live and archived rows together */
    included = "included",
}

export interface ISearchObject extends Record<string, any> {
    q?: string
    /** unset behaves as `ArchivedFilter.excluded`; set `only`/`included` to reach archived rows */
    archived?: ArchivedFilter
}
