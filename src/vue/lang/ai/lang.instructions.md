# Regira JsLib Lang (i18n) — AI Agent Instructions

The front-end internationalization layer (`regira/vue/lang`): keyed translation message
dictionaries, `{param}` interpolation via `formatText`, the `useLang` composable that holds the active
language as reactive state, and a Vue `plugin` that wires `$t` / `$tm` global properties. Entity labels
and any user-facing strings flow through `$t`/`useLang().translate`.

> **Never guess** a signature — verify in [lang.signatures.md](lang.signatures.md).

## Import

```ts
import {
    useLang,
    plugin,
    translate,
    translateMessage,
    formatText,
    LangSelector,
    type LangSelectorProps,
    type ITranslationMessages,
    type ITranslationMessage,
    type IFormatInput,
} from "regira/vue/lang"
```

The package exposes a single subpath, `regira/vue/lang` (no granular sub-exports).

## Setup (the plugin)

Call **`app.use(plugin, { defaultLang, messages })` once** at startup. `messages` is either a
`ITranslationMessages` dictionary or an async loader `() => Promise<ITranslationMessages>` (loaded via
`watchEffect`). `defaultLang` sets **both** the active language and the fallback language (defaults to
`"en"`). The plugin installs two component globals:

- **`$t(key, formatArgs?)`** — look up `key` in the loaded messages for the current language.
- **`$tm(message, formatArgs?)`** — translate an inline `ITranslationMessage` (a per-language map or a
  plain string), e.g. an entity field that already carries its own translations.

```ts
app.use(plugin, { defaultLang: "nl", messages: () => import("./i18n/nl.json").then((m) => m.default) })
```

## The composable

`useLang()` returns the shared (module-singleton) state and helpers — the same state the plugin drives,
so calling it in a component reads/writes the app-wide language:

- `langCode`, `fallbackLangCode`, `messages` — reactive `Ref`s.
- `translate(key, formatArgs?)` — resolves against `langCode`, then automatically retries against
  `fallbackLangCode`.
- `translateMessage(message, formatArgs?)` — same fallback behavior for an inline message object.
- `setLangCode(newValue)` — switch language (ignores empty values).
- `replaceMessages(values)` — replace the whole dictionary; `loadMessages(values)` — merge into it.

## The language selector — show it when the app is multilanguage

**A multilanguage app must give the user a visible way to switch** — never wire `useLang` without one.
Use the provided `LangSelector` (props: `{ langs: string[] }`, emits `select`; root hook
`rg-lang-selector`) in the header — and optionally in modal headers:

```vue
<LangSelector :langs="['en', 'fr', 'nl']" />
```

It renders an inline list of language codes (active one bold) and calls `setLangCode` on click; restyle
it via the `rg-lang-selector` hook or replace it — it's a 15-line reference skin over
`useLang().langCode/setLangCode`.

## Translating and interpolating

`translate(key, values, langCode, formatArgs?)` and `translateMessage(message, langCode, formatArgs?)`
are the pure functions the composable wraps. A message value is either a string or a
`Record<langCode, string>`; the chosen `langCode` is tried first, then its 2-letter prefix (so `en-US`
falls back to `en`). `formatText(input, formatArgs)` does the `{param}` substitution: pass a
`Record<string, string | number | Date | undefined>` to fill placeholders, or pass a function
`(input) => string` to transform the raw string yourself.

```ts
formatText("Hello {name}", { name: "Bram" }) // "Hello Bram"
useLang().translate("greeting", { name: "Bram" })
```

## Gotchas

- **`$t` returns `""` until messages load.** With an async `messages` loader the plugin gates `$t` on an
  internal `messagesLoaded` flag, so early renders yield empty strings — they fill in once the promise
  resolves. (`$tm` is not gated.)
- **`defaultLang` is also the fallback.** There is no separate fallback option; whatever you pass (or
  `"en"`) becomes both the initial and fallback language. Change the active language afterward with
  `setLangCode`.
- **Missing key returns the key.** `translate` logs `console.warn` and returns the `key` unchanged when
  it is absent; a missing language inside a message resolves to `undefined` (no further fallback to the
  first available value).
- **Singleton state.** `useLang()` shares module-level refs, so language and messages are global to the
  app — do not expect per-instance isolation.

## See also

- [lang.signatures.md](lang.signatures.md)
- [lang.examples.md](lang.examples.md) — copy-paste basics
- [Entities](../../entities/ai/entities.instructions.md) — labels/fields translated via `$tm`
- [HTTP](../../http/ai/http.instructions.md) — where an async message loader typically fetches from
