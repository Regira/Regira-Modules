export type LangSelectorProps = {
    /** language codes to offer, e.g. ["en", "fr", "nl"] */
    langs: Array<string>
}
export type LangSelectorEmits = {
    (e: "select", langCode: string): void
}
