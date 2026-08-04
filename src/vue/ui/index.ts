import "./theme/tokens.scss"
import "./theme/layout.scss"

export {
    useAutocomplete,
    autocompleteDefaults,
    type AutocompleteProps,
    type AutocompleteEmits,
    type AutocompleteSlots,
    type AutocompleteOut,
} from "./autocomplete/autocomplete"
export { default as Autocomplete } from "./autocomplete/Autocomplete.vue"
export * from "./buttons"
export * from "./input"
export * from "./gis"
export {
    useFeedback,
    Feedback,
    Pending,
    Success,
    ErrorSummary,
    FeedbackStatus,
    feedbackDefaults,
    plugin as feedbackPlugin,
    type FeedbackOut,
    type FeedbackEmits,
    type FeedbackProps,
    type FeedbackSlots,
} from "./feedback"
export {
    Icon,
    BsIcon,
    FaIcon,
    IconButton,
    plugin as iconPlugin,
    load as loadIcons,
    iconDefaults,
    iconButtonDefaults,
    type IIconProvider,
    type IconsConfig,
    type IconSize,
    type IconProps,
    type IconComponent,
    type IconButtonProps,
    type IconButtonSlots,
    type IconButtonComponent,
} from "./icons"
export {
    Loading,
    LoadingButton,
    LoadingContainer,
    injectLoading,
    LOADING_COMPONENT_KEY,
    plugin as loadingPlugin,
    type LoadingInput,
    type LoadingComponent,
    type LoadingContainerProps,
    type LoadingContainerSlots,
    type LoadingContainerComponent,
    type LoadingButtonProps,
    type LoadingButtonSlots,
    type LoadingButtonComponent,
} from "./loading"
export {
    DefaultModal,
    ModalType,
    modalDefaults,
    injectModal,
    MODAL_COMPONENT_KEY,
    plugin as modalPlugin,
    type ModalProps,
    type ModalEmits,
    type ModalSlots,
    type ModalComponent,
} from "./modal"
export {
    Paging,
    ResultSummary,
    ButtonType,
    usePaging,
    pagingDefaults,
    plugin as pagingPlugin,
    type PagingProps,
    type PagingEmits,
    type PagingSlots,
    type PagingComponent,
    type ResultSummaryProps,
    type ResultSummarySlots,
} from "./paging"
export { useScreen, plugin as screenPlugin } from "./screen"
export * from "./tabs"
