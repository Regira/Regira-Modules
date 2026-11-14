/**
 * The texts the entity views show in their feedback, in English. Each is the key an app translates it under — in its
 * `useLang` messages, or through its `setErrorTranslator` — and the text shown without a translation; a `{name}` in it
 * is filled from the view's own value (`{title}`: the row's `$title`; `{id}`: its id).
 */
export const feedbackTexts = {
    // the form
    readonly: "Readonly",
    saving: "Saving...",
    saved: "Saved",
    savingFailed: "Saving failed",
    itemNotFound: "Item not found",
    serverError: "Server error",
    deleting: "Deleting...",
    deleted: "Deleted",
    deletingFailed: "Deleting failed",
    restoring: "Restoring...",
    restored: "Restored",
    restoringFailed: "Restoring failed",
    // the overview
    fetchingDataFailed: "fetching data failed",
    savedTitle: "Saved {title}",
    savingTitleFailed: "Saving {title} failed",
    removingTitleFailed: "Removing {title} failed",
    // the details page, and the form modal
    fetchingItemFailed: "Fetching item #{id} failed",
    fetchingTitleFailed: "Fetching {title} failed",
    notAllowed: "Not allowed",
    notFound: "Not found",
} as const
