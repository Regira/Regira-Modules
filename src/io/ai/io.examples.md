# Regira JsLib IO — Examples

Verify signatures in [io.signatures.md](io.signatures.md). Both helpers are browser-only — instantiate them
per use.

## Pick files and read JSON

`browse` opens a hidden file picker and resolves with the chosen `File[]`:

```ts
import { FileHelper } from "regira/io"

const fh = new FileHelper()
const [file] = await fh.browse({ accept: "application/json", multiple: false })
if (file) {
    const config = await fh.readJson(file) // text -> JSON.parse
}
```

## Download a blob

`saveAs` normalises the input (File, Blob, URL, or base64) and triggers a browser download:

```ts
import { FileHelper } from "regira/io"

const fh = new FileHelper()
await fh.saveAs(blob) // uses the blob's own name/type
await fh.writeJson(report, "report.json").then((b) => fh.saveAs(b))
```

## Resize an image before upload

`resize` scales so the longest side is at most `max` (never upscales) and returns a new
`HTMLImageElement`; turn it back into a `Blob` with `getBlob`:

```ts
import { ImageHelper } from "regira/io"

const ih = new ImageHelper()
const [picked] = await ih.browse({ accept: "image/*", multiple: false })
const resized = await ih.resize(picked, 800, { quality: 0.8 })
const blob = await ih.getBlob(resized, "thumbnail.jpg", "image/jpeg")
```

## See also

- [io.instructions.md](io.instructions.md) · [io.signatures.md](io.signatures.md)
