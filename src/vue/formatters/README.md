# Regira Formatters (front-end)

`@regira/modules/vue/formatters` — a flat set of locale-aware display helpers for dates, times, numbers,
currency and percentages, plus a few string utilities. All are named exports; use them to render
[entity](../entities/README.md) values in Vue templates and computed props.

## What it provides

| Export                                                   | Purpose                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `formatDate(date?, culture?)`                            | Locale date via `toLocaleDateString`; an unusable tag logs and falls back to the browser default. |
| `formatShortDate(date?, culture?)`                       | `dd/MM` (or `MM/dd` for US cultures).                                                             |
| `formatDateTime(date?, mask?)`                           | Custom mask, default `dd-MM-yyyy`.                                                                |
| `dateInputString(date?)`                                 | `yyyy-MM-dd` for `<input type="date">`.                                                           |
| `dateTimeInputString(date?)`                             | `yyyy-MM-ddTHH:mm` for `<input type="datetime-local">`.                                           |
| `formatTime(date?)`                                      | `hh:mm`, 24-hour.                                                                                 |
| `formatNumber(value?, culture?, minDigits?, maxDigits?)` | Fixed-fraction number (`minDigits` default 2).                                                    |
| `formatNumberCompact(value?, culture?)`                  | Compact notation (`1.2K`).                                                                        |
| `formatCurrency(value?, culture?, currency?)`            | Currency, default `EUR`.                                                                          |
| `formatCurrencyCompact(value?, culture?, currency?)`     | Compact currency.                                                                                 |
| `formatPercentage(value?, culture?)`                     | Percent; `value > 1` is divided by 100.                                                           |
| `formatBankaccount(input)`                               | Group a 16-char Belgian `BE…` IBAN; else `""`.                                                    |
| `formatStructuredReference(input)`                       | Group digits `3/4/5`.                                                                             |
| `getInitials(input)`                                     | Uppercase initials from words.                                                                    |
| `formatTextPreserveNewLines(input)`                      | `\n` → `<br/>` (use with `v-html`).                                                               |
| `shortenString(str, maxLength)`                          | Truncate at a word boundary with `...`.                                                           |
