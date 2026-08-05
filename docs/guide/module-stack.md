# The module stack

`@regira/modules` is organised as small, independently importable modules. Most apps wire the Vue
platform plugins together once at startup and then build features on top of the **entities** CRUD
client. The core modules are framework-agnostic and usable on their own.

## Vue modules

| Module | Import | Role |
|--------|--------|------|
| [Entities (CRUD)](/reference/vue-entities/) | `@regira/modules/vue/entities` | Vue 3 CRUD client mirroring the back-end Entities API: services, stores, overview/details/form composables. |
| [HTTP](/reference/vue-http/) | `@regira/modules/vue/http` | Shared axios instance + request helpers. |
| [IoC](/reference/vue-ioc/) | `@regira/modules/vue/ioc` | Service container / dependency registration. |
| [Auth](/reference/vue-auth/) | `@regira/modules/vue/auth` | JWT bearer authentication. |
| [UI](/reference/vue-ui/) | `@regira/modules/vue/ui` | Components & plugins (icons, screen, loading, modal, feedback). |
| [App](/reference/vue-app/) | `@regira/modules/vue/app` | App lifecycle, status & culture. |
| [Lang](/reference/vue-lang/) | `@regira/modules/vue/lang` | i18n / translations. |
| [Formatters](/reference/vue-formatters/) | `@regira/modules/vue/formatters` | Display formatters. |
| [Directives](/reference/vue-directives/) | `@regira/modules/vue/directives` | Custom Vue directives (registered as plugins). |
| [Online](/reference/vue-online/) | `@regira/modules/vue/online` | Connectivity state. |
| [Debug](/reference/vue-debug/) | `@regira/modules/vue/debug` | Debug helpers. |
| [Vue Helper](/reference/vue-helper/) | `@regira/modules/vue/vue-helper` | Composition helpers: `createFromComputedPool`, `useEventListener`, `useVModelField` (v-model bridge for composables — components use native `defineModel`). |

## Core (framework-agnostic)

| Module | Import | Role |
|--------|--------|------|
| [Utilities](/reference/utilities/) | `@regira/modules/utilities` | Array / string / file / promise helpers. |
| [Extensions](/reference/extensions/) | `@regira/modules/extensions` | Prototype-style extensions (e.g. date-extensions). |
| [TreeList](/reference/treelist/) | `@regira/modules/treelist` | Tree data structure & traversal. |
| [Events](/reference/events/) | `@regira/modules/events` | Lightweight event mixin (`EventHandler.injectInto` adds `on`/`once`/`off`/`trigger` to any object). |
| [IO](/reference/io/) | `@regira/modules/io` | File / image helpers. |

> Each reference page is generated from that module's own `README.md` and `docs/` in the
> repository, so it always reflects the source.
