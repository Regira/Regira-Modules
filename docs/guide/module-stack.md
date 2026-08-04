# The module stack

`regira` is organised as small, independently importable modules. Most apps wire the Vue
platform plugins together once at startup and then build features on top of the **entities** CRUD
client. The core modules are framework-agnostic and usable on their own.

## Vue modules

| Module | Import | Role |
|--------|--------|------|
| [Entities (CRUD)](/reference/vue-entities/) | `regira/vue/entities` | Vue 3 CRUD client mirroring the back-end Entities API: services, stores, overview/details/form composables. |
| [HTTP](/reference/vue-http/) | `regira/vue/http` | Shared axios instance + request helpers. |
| [IoC](/reference/vue-ioc/) | `regira/vue/ioc` | Service container / dependency registration. |
| [Auth](/reference/vue-auth/) | `regira/vue/auth` | JWT bearer authentication. |
| [UI](/reference/vue-ui/) | `regira/vue/ui` | Components & plugins (icons, screen, loading, modal, feedback). |
| [App](/reference/vue-app/) | `regira/vue/app` | App lifecycle, status & culture. |
| [Lang](/reference/vue-lang/) | `regira/vue/lang` | i18n / translations. |
| [Formatters](/reference/vue-formatters/) | `regira/vue/formatters` | Display formatters. |
| [Directives](/reference/vue-directives/) | `regira/vue/directives` | Custom Vue directives (registered as plugins). |
| [Online](/reference/vue-online/) | `regira/vue/online` | Connectivity state. |
| [Debug](/reference/vue-debug/) | `regira/vue/debug` | Debug helpers. |
| [Vue Helper](/reference/vue-helper/) | `regira/vue/vue-helper` | Composition helpers: `createFromComputedPool`, `useEventListener`, `useVModelField` (v-model bridge for composables — components use native `defineModel`). |

## Core (framework-agnostic)

| Module | Import | Role |
|--------|--------|------|
| [Utilities](/reference/utilities/) | `regira/utilities` | Array / string / file / promise helpers. |
| [Extensions](/reference/extensions/) | `regira/extensions` | Prototype-style extensions (e.g. date-extensions). |
| [TreeList](/reference/treelist/) | `regira/treelist` | Tree data structure & traversal. |
| [Events](/reference/events/) | `regira/events` | Lightweight event bus. |
| [IO](/reference/io/) | `regira/io` | File / image helpers. |

> Each reference page is generated from that module's own `README.md` and `docs/` in the
> repository, so it always reflects the source.
