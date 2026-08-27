import { ref, computed, watch, onMounted, onUnmounted, type Ref, type StyleValue } from "vue"
import { useEventListener } from "../../vue-helper"
import { debounceToPromise } from "../../../utilities/promise-utility"
import { getAbsScrollPosition } from "../../../utilities/html-utility"

type IDefaultKey = number | string
type IOffset = { top: number; left: number }
type IResultStyle = StyleValue & {
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
    resultOffset: Ref<IOffset>
    resultStyle: Ref<IResultStyle>
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
    // the panel's measured box: `resultHeight` is what it renders at, `resultContentHeight` what its content
    // wants — together they tell the placement below whether the panel is being cut off where it stands
    const resultHeight = ref(0)
    const resultContentHeight = ref(0)
    const containerOffset = ref<IOffset>({ top: 0, left: 0 })
    const resultOffset = ref<IOffset>({ top: 0, left: 0 })
    const scrollPosition = ref<IOffset>({ top: 0, left: 0 })
    const resultStyle = computed<IResultStyle>(() => {
        // getBoundingClientRect()/offsetWidth/innerWidth are plain reads, not reactive sources — touching the
        // tracked offset is what re-runs this measurement after a resize or a scroll (see the listeners below).
        void containerOffset.value
        const { height } = inputEl.value?.getBoundingClientRect() || { height: 0 }
        // The panel is absolutely positioned against the input's offsetParent. Inside an InputSelector that
        // parent is the whole `.input-group` (prepend button + input + append buttons), so align and size to
        // the control rather than to the bare input — the input is the narrowest part of it.
        const offsetParent = inputEl.value?.offsetParent as HTMLElement | null | undefined
        const control = inputEl.value?.closest?.(".input-group") as HTMLElement | null | undefined
        const alignToControl = !!control && control === offsetParent
        const anchor = alignToControl ? control! : inputEl.value
        // size to the results, never narrower than the control they belong to — a fixed input width made
        // every item wrap onto two lines
        const floor = (alignToControl ? control!.offsetWidth : inputEl.value?.offsetWidth) || 0
        // Right-edge guard. `width: max-content` grows rightwards from `left`, so a control sitting near the
        // right edge of a narrow viewport would push the panel past it — and an absolutely positioned box
        // still extends the document's scrollable area, so that overflows the PAGE even while the panel is
        // closed (it is visibility:hidden, not display:none). Hence the guard is independent of isOpen.
        // Two steps: cap the width to the room actually left on the side the panel opens to, and — only when
        // even `floor` cannot fit to the right — flip to right-alignment so it grows leftwards from the
        // control's right edge instead. minWidth beats maxWidth in CSS, so the floor above survives both.
        const viewport = typeof window === "undefined" ? 0 : window.innerWidth || 0
        const rect = anchor?.getBoundingClientRect?.()
        const roomRight = rect ? viewport - rect.left - VIEWPORT_GUTTER : 0
        const roomLeft = rect ? rect.right - VIEWPORT_GUTTER : 0
        const alignRight = viewport > 0 && roomRight < floor && roomLeft > roomRight
        const room = viewport > 0 ? Math.max(0, Math.round(alignRight ? roomLeft : roomRight)) : 0
        // right-aligning insets the panel from the offsetParent's right edge to the anchor's own right edge
        const inputRight = (inputEl.value?.offsetLeft || 0) + (inputEl.value?.offsetWidth || 0)
        const rightInset = alignToControl ? 0 : Math.max(0, (offsetParent?.offsetWidth || 0) - inputRight)
        // Bottom-edge guard, the vertical twin of the one above. The panel opens downwards, so a control near
        // the bottom of the viewport — the everyday case for a form inside a modal — drops its results off
        // screen. Two steps again: flip the panel above the control when the results do not fit below it and
        // there is more room up there, and cap its height to the room on the side it opens to, so a list that
        // still does not fit scrolls inside the viewport instead of running past its edge.
        const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight || 0
        const roomBelow = rect ? viewportHeight - rect.bottom - VIEWPORT_GUTTER : 0
        const roomAbove = rect ? rect.top - VIEWPORT_GUTTER : 0
        // A panel that scrolls its own content is only as tall as the room already granted to it, so "fits"
        // has to be strict there: one capped to a cramped roomBelow measures exactly roomBelow, and a loose
        // comparison would call that a fit and never let it discover the roomier side above.
        const isScrolling = resultContentHeight.value > resultHeight.value
        const fitsBelow = isScrolling ? resultHeight.value < roomBelow : resultHeight.value <= roomBelow
        const flipUp = viewportHeight > 0 && !fitsBelow && roomAbove > roomBelow
        const roomVertical = viewportHeight > 0 ? Math.max(0, Math.round(flipUp ? roomAbove : roomBelow)) : 0
        // flipped, the panel's bottom edge lands on the input's own top edge: `100%` is the offsetParent's top,
        // which is where the input sits in the same layouts the `top` branch below assumes
        const inputTop = inputEl.value?.offsetTop || 0
        return {
            visibility: isOpen.value ? "visible" : "hidden",
            top: flipUp ? "auto" : `${height}px`,
            bottom: flipUp ? (inputTop ? `calc(100% - ${inputTop}px)` : "100%") : "auto",
            left: alignRight ? "auto" : `${alignToControl ? 0 : inputEl.value?.offsetLeft || 0}px`,
            right: alignRight ? `${rightInset}px` : "auto",
            minWidth: `${floor}px`,
            width: "max-content",
            maxWidth: room > 0 ? `min(90vw, 32rem, ${room}px)` : "min(90vw, 32rem)",
            maxHeight: roomVertical > 0 ? `min(var(--rg-dropdown-max-height, 13rem), ${roomVertical}px)` : undefined,
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
    function checkMatch(allowAutoSelect: boolean = false): void {
        // check (and set selection automatically) if the input value corresponds with a value in the results
        if (selectedItem.value == null && items.value) {
            const matches = (items.value as Array<T>)?.filter(
                (item) => (displayItemFormatter(item)?.toString() || "").toLowerCase() === q.value?.toLowerCase()
            )
            if (matches.length == 1) {
                setSelection(matches[0])
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
        closeResults()
        setSelection(item, item ? index : -1)
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
        const newSelectedIndex = selectedIndex.value + step
        const newSelectedItem = (items.value as Array<T>)[newSelectedIndex]
        if (newSelectedIndex >= 0 && newSelectedIndex < (items.value as Array<T>).length) {
            setSelection(newSelectedItem, newSelectedIndex)
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
    function getAbsOffset(element?: HTMLElement): IOffset {
        let top = 0,
            left = 0

        do {
            top += element?.offsetTop || 0
            left += element?.offsetLeft || 0
            element = element?.offsetParent as HTMLElement
        } while (element)

        return {
            top: top,
            left: left,
        }
    }
    function openResults(): void {
        updateMeasurements()
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
        // the panel is visibility:hidden rather than display:none, so it measures while closed too
        resultHeight.value = resultEl.value?.offsetHeight || 0
        resultContentHeight.value = resultEl.value?.scrollHeight || 0
    }
    const updateMeasurements = () => {
        containerOffset.value = getAbsOffset(inputEl.value)
        scrollPosition.value = inputEl.value ? getAbsScrollPosition(inputEl.value) : { top: 0, left: 0 }
        measureResult()
    }
    const debouncedUpdateMeasurements = debounceToPromise(updateMeasurements, 50) as unknown as () => Promise<void>

    useEventListener(window, "resize", debouncedUpdateMeasurements)
    onMounted(() => {
        q.value = displayItemFormatter(selectedItem.value)
        updateMeasurements()
        document.addEventListener("scroll", debouncedUpdateMeasurements, true)
    })
    onUnmounted(() => {
        document.removeEventListener("scroll", debouncedUpdateMeasurements, true)
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
            // a search in flight keeps the previous measurement: measuring the loading row instead would
            // bounce the panel between above and below on every keystroke
            if (items.value) {
                measureResult()
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
