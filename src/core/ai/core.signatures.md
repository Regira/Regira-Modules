# Regira Core — API Signatures Reference

The exports of `@regira/modules/core`. Do not guess — look up here first. Every export but one is the same
declaration a `vue/*` entry exports; its verbatim signature is in that module's reference, linked per area.

```ts
import {
    // entity model and services — entities.signatures.md
    type IEntity,
    isNewEntity,
    EntityBase,
    EntityServiceBase,
    JSONService,
    type IEntityService,
    type DetailsResult,
    type ListResult,
    type SaveResult,
    type SavedResult,
    type SearchResult,
    type DeleteResult,
    type IConfig,
    NavTypes,
    type ISearchObject,
    ArchivedFilter,
    SearchObjectBase,
    DefaultSearchObject,
    type IPagingInfo,
    PagingInfo,
    DEFAULT_PAGESIZE,
    type ISortByInfo,
    SortByInfo,
    EntityDescriptor,
    type IEntityDescriptor,
    // navigation — entities.signatures.md
    type INavCore,
    type INavItem,
    type IRoutingNavItem,
    NavItem,
    NavGroup,
    createNavItem,
    createNavGroup,
    importDashboard,
    importNavbar,
    buildNavigationTree,
    isNavItem,
    type IImportDashboardInput,
    type IImportNavbarInput,
    // query and date helpers — entities.signatures.md
    cleanQueryParams,
    parseQueryParams,
    liftDates,
    type DateKeys,
    // http — http.signatures.md
    initAxios,
    useAxios,
    getFile,
    upload,
    createQueryString,
    type AxiosWithFilesInstance,
    // service container — ioc.signatures.md
    ServiceProvider,
    defaultServiceProvider,
    get,
    type IServiceProvider,
    // formatters — formatters.signatures.md
    formatDate,
    formatShortDate,
    formatDateTime,
    formatTime,
    dateInputString,
    dateTimeInputString,
    formatNumber,
    formatNumberCompact,
    formatCurrency,
    formatCurrencyCompact,
    formatPercentage,
    formatBankaccount,
    formatStructuredReference,
    formatTextPreserveNewLines,
    getInitials,
    shortenString,
    // auth service and token managers — auth.signatures.md
    AuthService,
    registerCredentialUrls,
    type IAuthOptions,
    type IAuthenticateInput,
    type IChangePasswordInput,
    type IForgotPasswordInput,
    type IResetPasswordInput,
    type ITokenManager,
    CookieTokenManager,
    MemoryTokenManager,
    LocalStorageTokenManager,
    // translations — lang.signatures.md
    translate,
    translateMessage,
    formatText,
    type ITranslationMessages,
    type ITranslationMessage,
    type IFormatInput,
    type FormatTextOptions,
    // errors of a failed request — ui.signatures.md
    toFeedbackError,
    fieldMessages,
    fieldLabel,
    setErrorTranslator,
    type ErrorTranslator,
    type FeedbackError,
} from "@regira/modules/core"
```

| Area                                              | Reference                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Entity model, services, navigation, query helpers | [entities.signatures.md](../../vue/entities/ai/entities.signatures.md)       |
| HTTP                                              | [http.signatures.md](../../vue/http/ai/http.signatures.md)                   |
| Service container                                 | [ioc.signatures.md](../../vue/ioc/ai/ioc.signatures.md)                      |
| Formatters                                        | [formatters.signatures.md](../../vue/formatters/ai/formatters.signatures.md) |
| Auth service, token managers, credential URLs     | [auth.signatures.md](../../vue/auth/ai/auth.signatures.md)                   |
| Translations                                      | [lang.signatures.md](../../vue/lang/ai/lang.signatures.md)                   |
| Errors of a failed request                        | [ui.signatures.md](../../vue/ui/ai/ui.signatures.md)                         |

## Service container

```ts
// the container `@regira/modules/vue/ioc` exports as its default — the one `get` resolves from
export declare const defaultServiceProvider: IServiceProvider
export declare function get<T>(key: any): T | undefined
```

## Translating errors

```ts
export type ErrorTranslator = (message: string, args: Record<string, unknown>) => string | undefined
// An app's translator wins over the framework layer's default, whichever is set first; `undefined` restores the
// default — in a Vue app the useLang messages, with no framework layer none (messages show as sent).
export declare function setErrorTranslator(translator: ErrorTranslator | undefined): void
```
