# Regira Core (front-end, framework-free)

`@regira/modules/core` — the part of the Vue modules that needs no framework: the entity model and its HTTP
services, the shared axios instance, the service container, the formatters, the auth service and token stores,
the translation helpers, and the mapping of a failed request to the errors a form shows. An app without Vue — a
React or plain TypeScript app — imports these from here and installs no Vue package.

A Vue app keeps importing them from the `vue/*` entries it always has (`vue/entities`, `vue/http`, …): those
re-export the same modules. Both entries hand out the same instances — a service registered on
`defaultServiceProvider` here is the one `$services` resolves, and the axios instance `initAxios` creates here is
the one `useAxios()` returns from `vue/http`.

## What it provides

| Area                          | Exports                                                                                                                                                                                                                                                                                    | Documented in                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Entity model and services     | `IEntity`, `isNewEntity`, `EntityBase`, `EntityServiceBase`, `JSONService`, `IEntityService` and its result types, `IConfig`, `NavTypes`, `ISearchObject`, `ArchivedFilter`, `SearchObjectBase`, `DefaultSearchObject`, `PagingInfo`, `DEFAULT_PAGESIZE`, `SortByInfo`, `EntityDescriptor` | [Entities](../vue/entities/README.md)     |
| Navigation                    | `NavItem`, `NavGroup`, `createNavItem`, `createNavGroup`, `importDashboard`, `importNavbar`, `buildNavigationTree`, `isNavItem`                                                                                                                                                            | [Entities](../vue/entities/README.md)     |
| Query and date helpers        | `cleanQueryParams`, `parseQueryParams`, `liftDates`                                                                                                                                                                                                                                        | [Entities](../vue/entities/README.md)     |
| HTTP                          | `initAxios`, `useAxios`, `getFile`, `upload`, `createQueryString`, `AxiosWithFilesInstance`                                                                                                                                                                                                | [HTTP](../vue/http/README.md)             |
| Service container             | `ServiceProvider`, `defaultServiceProvider`, `get`, `IServiceProvider`                                                                                                                                                                                                                     | [IoC](../vue/ioc/README.md)               |
| Formatters                    | `formatDate`, `formatShortDate`, `formatDateTime`, `formatNumber`, `formatCurrency`, `formatPercentage`, …                                                                                                                                                                                 | [Formatters](../vue/formatters/README.md) |
| Auth service and token stores | `AuthService`, `IAuthOptions`, `CookieTokenManager`, `MemoryTokenManager`, `LocalStorageTokenManager`, `registerCredentialUrls`                                                                                                                                                            | [Auth](../vue/auth/README.md)             |
| Translations                  | `translate`, `translateMessage`, `formatText`                                                                                                                                                                                                                                              | [Lang](../vue/lang/README.md)             |
| Errors of a failed request    | `toFeedbackError`, `fieldMessages`, `fieldLabel`, `setErrorTranslator`, `FeedbackError`, `ErrorTranslator`                                                                                                                                                                                 | [UI](../vue/ui/README.md)                 |

Each export behaves as its module's docs describe; this entry adds no API of its own except `defaultServiceProvider`,
the container `vue/ioc` exports as its default.

## Translating validation messages without Vue

`toFeedbackError` pairs each validation message with the app's translations. In a Vue app the default is the
`useLang` messages. Without a framework layer there is no default: a message shows as the server sent it until the
app sets its own translator, once at startup.

```ts
import { setErrorTranslator, translate, formatText, type ITranslationMessages } from "@regira/modules/core"

const messages: ITranslationMessages = {
    Required: { en: "This field is required", nl: "Dit veld is verplicht" },
    MaxLength: { en: "At most {MaxLength} characters", nl: "Hoogstens {MaxLength} tekens" },
}
setErrorTranslator((key, args) =>
    messages[key] == null
        ? undefined
        : translate(key, messages, "en", (text) => formatText(text, args as Record<string, string>, { ignoreCase: true }))
)
```

The server may name an arg `maxLength` for a `{MaxLength}` placeholder, so match names with `ignoreCase`, as the Vue
default does. An app's translator wins over the default whichever of the two is set first;
`setErrorTranslator(undefined)` restores the default.

## What stays in the Vue modules

The composables (`useSearchView`, `useDetails`, `useForm`, …), the stores, the plugins, the route guard and every
component import Vue, and stay in their `vue/*` modules.
