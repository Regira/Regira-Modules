# Regira JsLib Lang — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/lang`. Do not guess — look up here first.

```ts
import {
    useLang,
    plugin,
    translate,
    translateMessage,
    formatText,
    type ITranslationMessages,
    type ITranslationMessage,
    type IFormatInput,
} from "regira/vue/lang"
```

## Translation messages (`translate`)

```ts
export type ITranslationMessage = Record<string, string> | string
export type ITranslationMessages = Record<string, ITranslationMessage>

export function translate(key: string, values: ITranslationMessages, langCode: string, formatArgs?: IFormatInput): string
export function translateMessage(message: ITranslationMessage, langCode: string, formatArgs?: IFormatInput): string
```

## Interpolation (`formatText`)

```ts
type IFormatValueInput = string | number | Date | undefined
type IFormatFunctionInput = (input: string) => string
export type IFormatInput = Record<string, IFormatValueInput> | IFormatFunctionInput

export function formatText(input: string, formatArgs: IFormatInput): string
```

## Composable (`useLang`)

```ts
export function useLang(): {
    langCode: import("vue").Ref<string, string>
    fallbackLangCode: import("vue").Ref<string, string>
    messages: import("vue").Ref<ITranslationMessages, ITranslationMessages>
    translate: (key: string, formatArgs?: IFormatInput) => string
    translateMessage: (message: ITranslationMessage, formatArgs?: IFormatInput) => string
    setLangCode(newValue: string): void
    replaceMessages: (newValue: ITranslationMessages) => ITranslationMessages
    loadMessages: (values: ITranslationMessages) => {
        [x: string]: ITranslationMessage
    }
}
```

## Vue plugin (`plugin`)

```ts
// IMessageLoader and IOptions are not exported; this is their shape:
type IMessageLoader = () => Promise<ITranslationMessages>
type IOptions = {
    defaultLang?: string // initial + fallback language, default "en"
    messages: ITranslationMessages | IMessageLoader
}
export const plugin: {
    install(app: App, options: IOptions): void
}
```

## Component globals

```ts
// declared on @vue/runtime-core ComponentCustomProperties by the plugin:
$t: (key: string, formatArgs?: IFormatInput) => string
$tm: (message: ITranslationMessage, formatArgs?: IFormatInput) => string
```

## `LangSelector` component

```ts
import { LangSelector, type LangSelectorProps, type LangSelectorEmits } from "regira/vue/lang"
export type LangSelectorProps = { langs: Array<string> } // e.g. ["en", "fr", "nl"]
export type LangSelectorEmits = { (e: "select", langCode: string): void }
// inline list of language codes (active one bold); calls useLang().setLangCode on click.
// root class hook: rg-lang-selector — show it in the header whenever the app is multilanguage.
```

## See also

- [lang.instructions.md](lang.instructions.md)
