# Regira Formatters — Examples

Verify signatures in [formatters.signatures.md](formatters.signatures.md).

## Format dates and currency in a template

The helpers are plain named exports — import the ones you need and call them in the template. `$culture`
is the app's current culture, passed as the `culture` argument:

```vue
<template>
    <div>{{ formatDate(item.invoiceDate, $culture) }}</div>
    <div>{{ formatCurrency(item.priceIncl, $culture) }}</div>
</template>

<script setup lang="ts">
import { formatCurrency, formatDate } from "regira/vue/formatters"
</script>
```

## Short date with a full-date tooltip

`formatShortDate` emits `dd/MM` for compact lists; pair it with `formatDate` in the `title` for the full date
on hover:

```vue
<template>
    <div :title="formatDate(item.interventionDate, $culture)">
        {{ formatShortDate(item.interventionDate, $culture) }}
    </div>
</template>

<script setup lang="ts">
import { formatDate, formatShortDate } from "regira/vue/formatters"
</script>
```

## Cache-bust a config fetch (main.ts)

`formatDateTime` takes a custom mask. With `"yyyyMMdd"` it yields a per-day version stamp for static asset URLs:

```ts
import { formatDateTime } from "regira/vue/formatters"

const v = formatDateTime(new Date(), "yyyyMMdd")
const config = await fetch(`${appConfig.baseUrl}/config.json?v=${v}`).then((r) => r.json())
```

## Initials from a name

`getInitials` takes the first letter of each word, uppercased — handy for avatar placeholders:

```ts
import { getInitials } from "regira/vue/formatters"

getInitials("Ada Lovelace") // => "AL"
```

## See also

- [formatters.instructions.md](formatters.instructions.md) · [formatters.signatures.md](formatters.signatures.md)
