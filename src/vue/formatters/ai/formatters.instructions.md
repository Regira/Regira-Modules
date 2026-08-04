# Regira Formatters — AI Agent Instructions

A flat set of locale-aware display helpers (`regira/vue/formatters`): dates, times, numbers,
currency, percentage, plus a few string utilities (bank account, structured reference, initials,
shortening). They format **values for display** — use them in Vue templates/computed props when rendering
[entity](../../entities/ai/entities.instructions.md) fields; they never parse or fetch.

> **Never guess** a signature — verify in [formatters.signatures.md](formatters.signatures.md).

## Import

All helpers are named exports of the single specifier:

```ts
import { formatDate, formatNumber, formatCurrency, formatPercentage } from "regira/vue/formatters"
```

There are no granular subpaths — everything lives under `regira/vue/formatters`.

## Dates & times

- **`formatDate(date?, culture?)`** — locale-driven via `toLocaleDateString(culture)`.
- **`formatShortDate(date?, culture?)`** — fixed `dd/MM` (or `MM/dd` when `culture` contains `"US"`), via
  date-fns `format`. Both accept a `Date` or an ISO `string`; `null`/`undefined` → `""`.
- **`formatDateTime(date?, mask?)`** — custom **mask**, default `"dd-MM-yyyy"`. Tokens: `d/dd`, `M/MM`,
  `yy/yyyy`, `h/hh` (hours, 24-hour — `H/HH` are aliases), `m/mm` (minutes), `n`…`nnnn` (ms). Every other
  character is emitted verbatim.
- **`dateInputString(date?)`** — `yyyy-MM-dd`, for `<input type="date">`.
- **`formatTime(date?)`** — wraps `formatDateTime(date, "hh:mm")`.

⚠️ **Mask or culture — the two families are not interchangeable.** `formatDateTime` / `formatTime` take a
token **mask**; `formatDate` / `formatShortDate` take a **culture**. Passing a locale tag as a mask
silently token-substitutes it instead of failing: `formatDateTime(d, "en-GB")` → `"e<ms>-GB"`, where
`<ms>` is the date's milliseconds (`n` is the millisecond token).

## Numbers, currency, percentage

- **`formatNumber(value?, culture?, minDigits = 2, maxDigits = minDigits)`** — `toLocaleString` with fixed
  fraction digits.
- **`formatNumberCompact(value?, culture?)`** — `notation: "compact"` (e.g. `1.2K`).
- **`formatCurrency(value?, culture?, currency = "EUR")`** / **`formatCurrencyCompact(...)`** —
  `style: "currency"`; compact variant adds `notation: "compact"`.
- **`formatPercentage(value?, culture?)`** — `style: "percent"`; treats `value > 1` as a whole percentage
  and divides by 100 (so `0.25` and `25` both render `25 %`).

All number helpers return `""` for `null`/`undefined`.

## String helpers

- **`formatBankaccount(input)`** — Belgian IBAN only: groups a 16-char `BE…` string into `xxxx xxxx xxxx xxxx`;
  anything else → `""`.
- **`formatStructuredReference(input)`** — pulls the digits out of `input` and joins them in `3/4/5` groups (e.g. `123/4567/89012`).
- **`getInitials(input)`** — first letter of each word, uppercased.
- **`formatTextPreserveNewLines(input)`** — replaces `\n` with `<br/>` (use with `v-html`).
- **`shortenString(str, maxLength)`** — truncates at the last word/`,`/`.` boundary and appends `"..."`;
  returns the input unchanged when within `maxLength`.

## Gotchas

- **`formatPercentage` auto-scales.** Any `value > 1` is divided by 100. Pass fractions (`0.25`) unless your
  source is already whole percentages.
- **`formatBankaccount` is BE-specific.** Non-`BE` or non-16-char input returns `""`, not the original.
- **`formatTextPreserveNewLines` emits HTML.** Render with `v-html`; sanitize untrusted input first.

## See also

- [formatters.examples.md](formatters.examples.md)
- [formatters.signatures.md](formatters.signatures.md)
- [Entities](../../entities/ai/entities.instructions.md) — the typical source of the values you format
- [HTTP](../../http/ai/http.instructions.md)
