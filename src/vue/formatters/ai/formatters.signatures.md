# Regira Formatters — API Signatures Reference

Verbatim TypeScript signatures for `@regira/modules/vue/formatters`. Do not guess — look up here first.

```ts
import {
    formatDateTime,
    dateInputString,
    dateTimeInputString,
    formatTime,
    formatDate,
    formatShortDate,
    formatNumber,
    formatNumberCompact,
    formatCurrency,
    formatCurrencyCompact,
    formatPercentage,
    formatBankaccount,
    getInitials,
    formatTextPreserveNewLines,
    formatStructuredReference,
    shortenString,
} from "@regira/modules/vue/formatters"
```

## Dates & times

```ts
// mask tokens: d/dd, M/MM, yy/yyyy, h/hh (24-hour; H/HH are aliases), m/mm, n…nnnn (ms).
// Any other character passes through verbatim.
export declare const formatDateTime: (date?: Date, mask?: string) => string // default mask "dd-MM-yyyy"
export declare const dateInputString: (date?: Date) => string // "yyyy-MM-dd"
export declare const dateTimeInputString: (date?: Date) => string // "yyyy-MM-ddTHH:mm" — local, no zone suffix
export declare const formatTime: (date?: Date) => string // wraps formatDateTime(date, "hh:mm")
export declare const formatDate: (date?: Date | string, culture?: string) => string
export declare const formatShortDate: (date?: Date | string, culture?: string) => string
```

⚠️ **`formatDateTime`/`formatTime` take a MASK; `formatDate`/`formatShortDate` take a CULTURE**, and neither
guesses which you meant — both signatures are `(Date, string)`, and no runtime test separates them (`"dd-MM"`
and `"yy"` are well-formed BCP-47 tags; `"en_US"`, the .NET `CultureInfo` spelling, is not). A locale tag
handed to `formatDateTime` is token-substituted, not rejected — `"en-GB"` renders `"e<ms>-GB"`, `<ms>` being
the date's milliseconds (`n` is the millisecond token). A mask handed to `formatDate` makes
`toLocaleDateString` raise `RangeError`; since that fires **during render** and would abort the component
subtree, `formatDate` catches it, logs to the console and falls back to the browser's default locale.

## Numbers, currency, percentage

```ts
export declare function formatNumber(value?: number, culture?: string, minDigits?: number, maxDigits?: number): string // minDigits = 2, maxDigits = minDigits
export declare function formatNumberCompact(value?: number, culture?: string): string
export declare function formatCurrency(value?: number, culture?: string, currency?: string): string // currency = "EUR"
export declare function formatCurrencyCompact(value?: number, culture?: string, currency?: string): string // currency = "EUR"
export declare function formatPercentage(value?: number, culture?: string): string // value > 1 divided by 100
```

## String helpers

```ts
export declare const formatBankaccount: (input: string) => string // 16-char "BE…" → grouped; else ""
export declare const getInitials: (input: string) => string
export declare const formatTextPreserveNewLines: (input: string) => string // "\n" → "<br/>"
export declare const formatStructuredReference: (input: string) => string // digits grouped 3/4/5
export declare function shortenString(str: string | undefined, maxLength: number): string | undefined
```

## See also

- [formatters.instructions.md](formatters.instructions.md)
