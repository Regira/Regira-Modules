import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Ref, type StyleValue } from "vue"
import { debounceToPromise } from "../../../utilities/promise-utility"

type IDefaultKey = number | string
type IOffset = { top: number; left: number }
type IRect = { top: number; bottom: number; left: number; right: number }
type IResultStyle = StyleValue & {
    position: string
    visibility: string
    top?: string
    bottom?: string
    left?: string
    right?: string
    transform?: string
    width?: string
    minWidth?: string
    maxWidth?: string
    maxHeight?: string
}

// Breathing room kept between the result panel and the viewport edge it opens towards.
const VIEWPORT_GUTTER = 8
// The tallest the panel renders, before the room around it limits it further.
const RESULT_MAX_HEIGHT = "var(--rg-dropdown-max-height, 13rem)"
// Numbers every useAutocomplete on the page, whatever skin calls it: the library's Autocomplete and an ejected
// copy both import this module, so their listbox ids cannot collide. (useId() numbers per app, and two apps on
// one page would share its ids.)
let instanceCount = 0

/** the box the panel aligns to: the whole `.input-group` when the input sits in one, else the input */
function getAnchor(input?: HTMLElement): HTMLElement | undefined {
    return (input?.closest?.(".input-group") as HTMLElement | null) || input
}
/** the fixed panel's containing block: the viewport without its scrollbars */
function getViewport(): { width: number; height: number } {
    if (typeof window === "undefined") {
        return { width: 0, height: 0 }
    }
    const root = document.documentElement
    return { width: root?.clientWidth || window.innerWidth || 0, height: root?.clientHeight || window.innerHeight || 0 }
}
/**
 * whether any part of `rect` is still shown by every scroll container (overflow other than visible) around `el`.
 * The walk ends at a `position: fixed` ancestor: nothing above it in the tree clips it (a modal rendered in
 * place inside a card or a scrollable list), though it can still clip its own content. A fixed `el` has no
 * clipping ancestor at all.
 */
function isVisibleInScrollParents(el: HTMLElement, rect: IRect): boolean {
    if (getComputedStyle(el).position === "fixed") {
        return true
    }
    for (let parent = el.parentElement; parent && parent !== document.body && parent !== document.documentElement; parent = parent.parentElement) {
        const { overflowX, overflowY, position } = getComputedStyle(parent)
        if (overflowX !== "visible" || overflowY !== "visible") {
            const clip = parent.getBoundingClientRect()
            if (rect.bottom <= clip.top || rect.top >= clip.bottom || rect.right <= clip.left || rect.left >= clip.right) {
                return false
            }
        }
        if (position === "fixed") {
            break
        }
    }
    return true
}

export interface AutocompleteEmits<T = any, TKey = IDefaultKey | T> {
    (e: "update:modelValue", args: T | undefined): void
    (e: "update:idValue", args: TKey | undefined): void
    (e: "select", args: T | undefined): void
    (e: "qInput", args: string): void
}
export interface AutocompleteProps<T = any, TKey = IDefaultKey | T> {
    idValue?: TKey
    modelValue?: T
    data?: Array<T>
    maxResults?: number
    debounceTime?: number
    enableDblClick?: boolean
    autoSelect?: boolean
    allowFreeInput?: boolean
    /**
     * the arrow keys only highlight a result, and Enter or a click selects it — for a selection that acts on every
     * change. Once the results are in, a result's exact text, typed, is selected by Enter or by a click outside the
     * control, not by Tab. Enter with nothing to select leaves the panel open.
     */
    confirmSelection?: boolean

    resultClass?: string
    itemsClass?: string
    itemClass?: string

    search?(term?: string): Promise<Array<T>>
    idSelector?(item?: T): TKey | undefined
    /** converts an item to its display string (input value + default result rendering) */
    displayItemFormatter?(item?: T): string
}
export type AutocompleteSlots<T = any> = {
    /** result-item rendering seam; the fallback renders the display string with the matched term in bold */
    default?(props: { item: T; q: string }): any
}
export const autocompleteDefaults = {
    data: () => [],
    maxResults: 10,
    debounceTime: 250,
    autoSelect: false,
}
export type AutocompleteOut<T = any, TKey = IDefaultKey | T> = {
    q: Ref<string>
    selectedItem: Ref<T | undefined>
    selectedIndex: Ref<number>
    selectedId: Ref<TKey | undefined>
    items: Ref<Array<T> | undefined>
    isOpen: Ref<boolean>
    isFocus: Ref<boolean>
    isLoading: Ref<boolean>
    inputEl: Ref<(HTMLElement & { value: string }) | undefined>
    /** the result panel; bind it (`ref="resultEl"`) so the placement can measure the panel it positions */
    resultEl: Ref<HTMLElement | undefined>
    /** @deprecated always `{ top: 0, left: 0 }` — `resultStyle` places the panel. Removed in the next major version. */
    resultOffset: Ref<IOffset>
    resultStyle: Ref<IResultStyle>
    /** id for the results `listbox`, unique on the page — the input's `aria-controls` */
    listboxId: string
    /** id for the result at `index` — the input's `aria-activedescendant` while that result is highlighted */
    optionId(index: number): string
    displayItemFormatter(item?: T): string
    handleInput(): void
    handleChange(): void
    handleSelect(item: T, index: number): void
    handleSearch(term?: string): void
    openResults(): void
    closeResults(): void
    closeGently(e?: PointerEvent): void
    moveSelection(step: number): void
    checkMatch(): void
    clearSelection(): void
    reset(): void
}

export function useAutocomplete<T = any, TKey = IDefaultKey | T>(
    props: AutocompleteProps<T, TKey>,
    { emit }: { emit: AutocompleteEmits<T, TKey> }
): AutocompleteOut<T, TKey> {
    const q = ref("")
    const selectedIndex = ref(-1)
    const items = ref(props.data) as Ref<Array<T> | undefined>
    const isOpen = ref(false)
    const isFocus = ref(false)
    const isLoading = ref(false)
    // the combobox → listbox wiring: the panel lives on <body>, so these ids are what tie it to the input
    const listboxId = `rg-autocomplete-${++instanceCount}`
    const optionId = (index: number): string => `${listboxId}-${index}`
    const selectedItem = computed({
        get: () => props.modelValue,
        set: (value) => {
            if (props.modelValue !== value) {
                emit("update:modelValue", value)
                emit("update:idValue", idSelector(value))
                emit("select", value)
            }
        },
    })
    const selectedId = computed<TKey | undefined>(() => idSelector(selectedItem.value))
    const inputEl = ref<(HTMLElement & { value: string }) | undefined>()
    const resultEl = ref<HTMLElement | undefined>()
    // the height the panel wants, whatever the room around it leaves it: see measureResult
    const resultHeight = ref(0)
    const resultOffset = ref<IOffset>({ top: 0, left: 0 })
    // The panel is `position: fixed` (Autocomplete also teleports it to <body>), so no ancestor with
    // `overflow: hidden/auto` — a scrollable modal body, a card, a list — can clip it. It is placed from the
    // anchor's viewport box; the anchor is the `.input-group` when there is one (InputSelector's prepend
    // button + input + append buttons), so the panel aligns and sizes to the control rather than to the bare
    // input, the narrowest part of it.
    // getBoundingClientRect()/clientWidth are plain reads, not reactive sources — bumping `layoutTick` is what
    // re-runs this measurement when the anchor moved or a new result list painted (see followAnchor below).
    const layoutTick = ref(0)
    const resultStyle = computed<IResultStyle>(() => {
        void layoutTick.value
        const anchor = getAnchor(inputEl.value)
        const rect = anchor?.getBoundingClientRect?.()
        // hidden while the anchor is scrolled out of view inside one of its scroll containers — a fixed panel
        // would otherwise float over whatever now covers that spot (a modal's header or footer)
        const anchorVisible = !anchor || !rect || isVisibleInScrollParents(anchor, rect)
        // size to the results, never narrower than the control they belong to — a fixed input width made
        // every item wrap onto two lines
        const floor = rect ? Math.round(rect.width) : 0
        // Right-edge guard. `width: max-content` grows rightwards from `left`, so a control sitting near the
        // right edge of a narrow viewport would push the panel past it. Two steps: cap the width to the room
        // actually left on the side the panel opens to, and — only when even `floor` cannot fit to the right —
        // flip to right-alignment so it grows leftwards from the control's right edge instead. minWidth beats
        // maxWidth in CSS, so the floor above survives both.
        const { width: viewport, height: viewportHeight } = getViewport()
        const roomRight = rect ? viewport - rect.left - VIEWPORT_GUTTER : 0
        const roomLeft = rect ? rect.right - VIEWPORT_GUTTER : 0
        const alignRight = viewport > 0 && roomRight < floor && roomLeft > roomRight
        const room = viewport > 0 ? Math.max(0, Math.round(alignRight ? roomLeft : roomRight)) : 0
        // Bottom-edge guard, the vertical twin of the one above. The panel opens downwards, so a control near
        // the bottom of the viewport — the everyday case for a form inside a modal — drops its results off
        // screen. Two steps again: flip the panel above the control when the results do not fit below it and
        // there is more room up there, and cap its height to the room on the side it opens to, so a list that
        // still does not fit scrolls inside the viewport instead of running past its edge.
        const roomBelow = rect ? viewportHeight - rect.bottom - VIEWPORT_GUTTER : 0
        const roomAbove = rect ? rect.top - VIEWPORT_GUTTER : 0
        const fitsBelow = resultHeight.value <= roomBelow
        const flipUp = viewportHeight > 0 && !fitsBelow && roomAbove > roomBelow
        const roomVertical = viewportHeight > 0 ? Math.max(0, Math.round(flipUp ? roomAbove : roomBelow)) : 0
        return {
            // set inline too, so a skin whose stylesheet still says `absolute` places the panel correctly
            position: "fixed",
            visibility: isOpen.value && anchorVisible ? "visible" : "hidden",
            top: flipUp ? "auto" : `${Math.round(rect?.bottom || 0)}px`,
            bottom: flipUp ? `${Math.round(viewportHeight - (rect?.top || 0))}px` : "auto",
            left: alignRight ? "auto" : `${Math.round(rect?.left || 0)}px`,
            right: alignRight ? `${Math.round(viewport - (rect?.right || 0))}px` : "auto",
            minWidth: `${floor}px`,
            width: "max-content",
            maxWidth: room > 0 ? `min(90vw, 32rem, ${room}px)` : "min(90vw, 32rem)",
            maxHeight: roomVertical > 0 ? `min(${RESULT_MAX_HEIGHT}, ${roomVertical}px)` : undefined,
        }
    })

    const idSelector = props.idSelector || ((item?: T): TKey | undefined => item as TKey)
    const displayItemFormatter = props.displayItemFormatter || ((item?: T) => (item ?? "").toString())

    async function dataItemsSearch(term = "") {
        return props.data?.filter((x) => displayItemFormatter(x).toLowerCase().startsWith(term.toLowerCase()))
    }

    async function handleSearch(term = q.value): Promise<void> {
        openResults()
        isLoading.value = true
        items.value = undefined
        try {
            const searchResult = await debouncedSearch(term)
            const pageSize = props.maxResults || searchResult.length
            items.value = searchResult.slice(0, pageSize)
            selectedIndex.value = (items.value as Array<T>)?.findIndex((x) => idSelector(x) == idSelector(selectedItem.value))
        } finally {
            isLoading.value = false
        }
    }
    function findMatch(): T | undefined {
        const matches = ((items.value as Array<T> | undefined) ?? []).filter(
            (item) => (displayItemFormatter(item)?.toString() || "").toLowerCase() === q.value?.toLowerCase()
        )
        return matches.length == 1 ? matches[0] : undefined
    }
    function checkMatch(allowAutoSelect: boolean = false): void {
        // check (and set selection automatically) if the input value corresponds with a value in the results
        if (selectedItem.value == null && items.value) {
            const match = findMatch()
            if (match != null) {
                setSelection(match)
            } else if (allowAutoSelect && props.autoSelect) {
                setSelection(items.value[0])
            }
        }
    }
    function handleInput(): void {
        clearSelection()
        handleSearch()
    }
    function handleChange(): void {
        // checkMatch() // disabled since it is called on blur and would interfere with clicking on results
        // emit select triggered automatically in selectedItem setter
    }
    function handleSelect(item: T, index: number): void {
        const selected = props.confirmSelection ? confirmedItem(item, index) : item
        // nothing to select yet: results on their way can still show, and a second Enter takes them
        if (props.confirmSelection && selected == null) {
            return
        }
        closeResults()
        setSelection(selected, selected ? index : -1)
    }
    function confirmedItem(item: T, index: number): T | undefined {
        // a highlight left behind on a closed panel is nobody's choice
        if (!isOpen.value) {
            return selectedItem.value
        }
        // a click, or a skin's Enter that passes the highlighted row: `index` need not point into `items` there
        if (item !== selectedItem.value) {
            return item
        }
        // Enter arrives with the current selection and the index the arrow keys highlighted
        return (items.value as Array<T> | undefined)?.[index] ?? item ?? (q.value ? findMatch() : undefined)
    }
    function setSelection(item?: T, index?: number): void {
        if (item == null && index == null) {
            clearSelection()
            if (!q.value) {
                closeResults()
            }
            return
        }
        if (item && (index == null || index < 0)) {
            index = ((items.value as Array<T>) || []).indexOf(item)
        } else if (!item && index! >= 0) {
            item = (items.value as Array<T>)[index!]
        }
        if (item != null) {
            // set q to the corresponding value for the resulting item
            selectedIndex.value = index!
            selectedItem.value = item // setter will emit update:modelValue
            q.value = displayItemFormatter(selectedItem.value) // use selectedItem after emit in case selection is cleared immediately in event handler
        }
    }
    function moveSelection(step: number): void {
        console.debug("moveSelection", { step, selectedIndex: selectedIndex.value, items: items.value })
        if (props.confirmSelection && !isOpen.value) {
            // nothing to highlight on a closed panel: Enter would select a row nobody can see
            handleSearch()
            return
        }
        const results = (items.value as Array<T> | undefined) ?? []
        const newSelectedIndex = selectedIndex.value + step
        if (newSelectedIndex >= 0 && newSelectedIndex < results.length) {
            if (props.confirmSelection) {
                selectedIndex.value = newSelectedIndex
            } else {
                setSelection(results[newSelectedIndex], newSelectedIndex)
            }
            document.getElementById(optionId(newSelectedIndex))?.scrollIntoView?.({ block: "nearest" })
        }
    }
    function clearSelection(): void {
        selectedIndex.value = -1
        selectedItem.value = undefined
    }
    function reset(): void {
        q.value = ""
        clearSelection()
        closeResults()
    }
    function openResults(): void {
        // a search in flight keeps the previous measurement: measuring the loading row instead would bounce the
        // panel between above and below on every keystroke
        if (items.value) {
            updateMeasurements()
        } else {
            layoutTick.value++
        }
        isOpen.value = true
    }
    function closeResults(): void {
        isOpen.value = false
    }
    function closeGently(): void {
        if (!isOpen.value) {
            return
        }

        setTimeout(() => {
            // clear visible input if no selection was made
            checkMatch(true)
            if (selectedItem.value == null) {
                q.value = ""
            }

            closeResults()
        }, 250)
    }

    function throwError<TReturn>(err: Error): TReturn {
        throw err
    }

    // search
    const search = props.search || (props.data && dataItemsSearch) || throwError<() => void>(new Error("prop search or data is required"))
    const debouncedSearch = debounceToPromise(search as (...args: unknown[]) => Promise<T[] | undefined>, props.debounceTime) as unknown as (
        term: string
    ) => Promise<Array<T>>

    function measureResult(): void {
        const el = resultEl.value
        if (!el?.style) {
            resultHeight.value = 0
            return
        }
        // Measured without the limit of the room around it, and restored before anything paints: a panel limited
        // to a cramped room measures as a fit there, and would never discover the roomier side. The panel is
        // visibility:hidden rather than display:none, so it measures while closed too.
        const limit = el.style.maxHeight
        el.style.maxHeight = RESULT_MAX_HEIGHT
        resultHeight.value = el.offsetHeight
        el.style.maxHeight = limit
    }
    const updateMeasurements = () => {
        layoutTick.value++
        measureResult()
    }
    // A fixed panel does not travel with the page: whatever moves the control — a scroll, a resize, a message
    // appearing above it, a section expanding, an image loading — has to be followed by hand. So while the
    // panel is open it checks the anchor's box once per frame and re-places itself only when that box (or the
    // viewport) actually moved. A closed panel costs nothing; openResults() measures it afresh.
    const nextFrame = (cb: () => void): number =>
        typeof requestAnimationFrame === "function" ? requestAnimationFrame(cb) : (setTimeout(cb, 16) as unknown as number)
    const cancelFrame = (id: number): void => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id))
    let frame = 0
    let lastLayout = ""
    function followAnchor(): void {
        frame = 0
        if (!isOpen.value) {
            return
        }
        const rect = getAnchor(inputEl.value)?.getBoundingClientRect?.()
        const { width, height } = getViewport()
        const layout = rect ? `${rect.top},${rect.left},${rect.width},${rect.height},${width},${height}` : ""
        if (layout !== lastLayout) {
            lastLayout = layout
            layoutTick.value++
        }
        frame = nextFrame(followAnchor)
    }
    watch(isOpen, (open) => {
        if (open && !frame) {
            lastLayout = ""
            frame = nextFrame(followAnchor)
        } else if (!open && frame) {
            cancelFrame(frame)
            frame = 0
        }
    })

    onMounted(() => {
        q.value = displayItemFormatter(selectedItem.value)
        updateMeasurements()
    })
    onUnmounted(() => {
        if (frame) {
            cancelFrame(frame)
        }
    })
    watch(selectedItem, (newVal, oldVal) => {
        if (newVal != oldVal && newVal != selectedItem.value) {
            setSelection(newVal)
        }
        if (newVal) {
            q.value = displayItemFormatter(selectedItem.value)
        }
    })
    watch(
        items,
        () => {
            // re-anchoring too: the form may have shifted since the panel opened — a message above it, a
            // section that expanded — without a scroll or resize to report it
            // nextTick: v-show hides the loading row in this same post-render queue, so it still counts here
            if (items.value) {
                nextTick(updateMeasurements)
            }
        },
        { flush: "post" }
    )
    watch(q, () => emit("qInput", q.value || ""))

    return {
        q,
        selectedItem,
        selectedIndex,
        selectedId,
        items,
        isOpen,
        isFocus,
        isLoading,
        inputEl,
        resultEl,
        resultOffset,
        resultStyle,
        listboxId,
        optionId,
        displayItemFormatter,
        handleInput,
        handleChange,
        handleSelect,
        handleSearch,
        openResults,
        closeResults,
        closeGently,
        moveSelection,
        checkMatch,
        clearSelection,
        reset,
    }
}
