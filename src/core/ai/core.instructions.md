# Regira Core — AI Agent Instructions

`@regira/modules/core` is the part of the Vue modules that loads no framework: the entity model and its HTTP
services, the shared axios instance, the service container, the formatters, the auth service and token
managers, the translation helpers, and `toFeedbackError`. Use it in an app **without Vue** (React, plain
TypeScript). In a Vue app, keep importing from the `vue/*` entries — they re-export these same modules.

> **Never guess** a signature — verify in [core.signatures.md](core.signatures.md). Examples:
> [core.examples.md](core.examples.md).

## When to use which entry

| App                       | Import from                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Vue 3 SPA                 | the `vue/*` entries (`@regira/modules/vue/entities`, `vue/http`, …), as their guides show             |
| React or plain TypeScript | `@regira/modules/core`, plus the framework-free `utilities`, `treelist`, `events`, `io`, `extensions` |

Never import a `vue/*` entry in an app without Vue: most of them, such as `vue/entities`, `vue/ui`, `vue/auth`,
`vue/lang` and `vue/app`, load Vue at runtime, and others, such as `vue/ioc`, declare Vue's types. `vue`, `vue-router` and `pinia` are
optional peers, so npm does not install them for an app that does not ask.

## One package, one instance

`core` and the `vue/*` entries share their modules. A service added to `defaultServiceProvider` is the one
`get(key)` returns from either entry, the axios instance `initAxios` creates is the one `useAxios()` returns, and
a translator set with `setErrorTranslator` applies to every caller of `toFeedbackError`.

## What each area is

Every export behaves exactly as its module's guide describes; read that guide for the details:

- **Entity model and services** — `EntityBase`, `EntityServiceBase`, `JSONService`, `IConfig`, `PagingInfo`,
  `SearchObjectBase`, navigation and query helpers: [entities guide](../../vue/entities/ai/entities.instructions.md),
  [entities signatures](../../vue/entities/ai/entities.signatures.md).
- **HTTP** — `initAxios`, `useAxios`, `getFile`, `upload`, `createQueryString`:
  [http guide](../../vue/http/ai/http.instructions.md).
- **Service container** — `ServiceProvider`, `get`; `defaultServiceProvider` is the container `vue/ioc` exports as
  its default: [ioc guide](../../vue/ioc/ai/ioc.instructions.md).
- **Formatters**: [formatters guide](../../vue/formatters/ai/formatters.instructions.md).
- **Auth service and token managers** — `AuthService`, the three token managers and `registerCredentialUrls`:
  [auth guide](../../vue/auth/ai/auth.instructions.md). The auth store,
  plugin, route guard and account components are Vue-only.
- **Translations** — `translate`, `translateMessage`, `formatText`: [lang guide](../../vue/lang/ai/lang.instructions.md).
  `useLang` and its reactive language state are Vue-only.
- **Errors of a failed request** — `toFeedbackError`, `fieldMessages`, `fieldLabel`, `setErrorTranslator`:
  [ui guide](../../vue/ui/ai/ui.instructions.md). `useFeedback` and the feedback components are Vue-only.

## Translating validation messages

`toFeedbackError` translates each validation message through the app's translator. A Vue app's default is the
`useLang` messages; **without a framework layer there is no default**, so a message shows as the server sent it
until the app calls `setErrorTranslator` once at startup. Fill a message's args with
`formatText(text, args, { ignoreCase: true })`, as the Vue default does: the server may name an arg `maxLength` for
a `{MaxLength}` placeholder. An app's translator wins over the default whichever
is set first; `setErrorTranslator(undefined)` restores the default.

## Gotchas

- Entities rely on their class: `$id` and `$title` are getters on the prototype, and `EntityServiceBase` throws
  on an update or a delete of an object without them. Build a new state from an entity with
  `Object.assign(new Product(), …)` or the service's `toEntity`, never with a spread (`{ ...item }`), which drops
  the getters.
- The composables, stores, plugins, route guard and components stay in the `vue/*` modules; this entry has no
  equivalent for them.
