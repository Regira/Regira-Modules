# Regira Utilities — Examples

Framework-agnostic helpers (no Vue). Verify signatures in [utilities.signatures.md](utilities.signatures.md).

Two import styles work: the **namespaced barrel** (`arrayUtility.orderBy`, `stringUtility.slugify`,
`fileUtility.saveAs`) or **granular subpaths** (`regira/utilities/array-utility`). The demo apps
mostly use the granular subpaths shown below.

## Group and order arrays

`arrayUtility` helpers accept any iterable and return a **new** array (they don't mutate). `groupBy`
returns `[key, items][]` tuples:

```ts
import { groupBy, orderBy } from "regira/utilities/array-utility"

const grouped = groupBy(items, (x) => x.title ?? "").map(([title, labels]) => ({ title, labels }))
const sorted = orderBy(rows, (x) => x.name.toUpperCase())
```

## Validate string input

```ts
import { isEmail, isDate, isPhone, isUrl } from "regira/utilities/string-utility"

function getLabelType(value: string) {
    if (isEmail(value)) return "email"
    if (isDate(value)) return "date"
    if (isPhone(value)) return "phone"
    if (isUrl(value)) return "url"
    return "text"
}
```

## Download a blob

`saveAs` triggers a browser download. A blob from the http layer carries its filename on `.name`:

```ts
import { saveAs } from "regira/utilities/file-utility"
import { useAxios } from "regira/vue/http"

const blob = await useAxios().getFile(url)
await saveAs(blob, (blob as any).name || "export.xlsx")
```

## Format a file size for display

```ts
import { formatFileSize } from "regira/utilities/file-utility"

const label = formatFileSize(attachment.length) // e.g. "1.4 kB"
```

## Same helpers via the barrel

```ts
import { arrayUtility, stringUtility } from "regira/utilities"

const ids = arrayUtility.distinctBy(rows, (x) => x.groupId)
const slug = stringUtility.slugify("My Vehicle Type")
```

## See also

- [utilities.instructions.md](utilities.instructions.md) · [utilities.signatures.md](utilities.signatures.md)
- [Vue HTTP](../../vue/http/ai/http.signatures.md) (the `useAxios().getFile` used above)
