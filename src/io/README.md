# Regira IO (front-end)

`@regira/modules/io` — browser file and image helpers. `FileHelper` normalises a `File`, `Blob`, URL, or
base64 string into a `Blob` and covers browse / download / upload / JSON; `ImageHelper` extends it with
canvas-based image transforms. Both wrap the lower-level [`@regira/modules/utilities`](../utilities)
file/image utilities and are DOM-dependent (browser only).

## What it provides

| Export        | Purpose                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FileHelper`  | Class: convert any input to a `Blob`, plus `browse`, `getBase64Url`/`createUrl`, `readJson`/`writeJson`, `send` (multipart), `saveAs` (download). |
| `ImageHelper` | Extends `FileHelper`: `getImage`, `resize`, `rotate`, `flip*`, `convertType`, `getLightness`, `white2transparent`.                                |

Both are named exports; the package root also default-exports `{ FileHelper, ImageHelper }`. Instantiate
per use (`new FileHelper()`, `new ImageHelper()`).

## Images

`ImageHelper.resize(input, max, options?)` scales so the longest side is at most `max` and never upscales. The
browser does the scaling, from a first canvas of at most 4096 px per side, so a phone's full-size photo resizes like
any other; transparency is kept for a type that has it (`options.type`; the default output is JPEG), and a JPEG gets a white background. The result's own canvas is `max` wide, so keep `max` at
4096 or below: iOS Safari leaves a larger canvas blank.

`getBlob(image)` makes no request for an image that holds its own bytes — the `data:` URL a transform returns, or an
image made from a `Blob`, which answers that `Blob` itself, its bytes untouched — so a `Content-Security-Policy` whose `connect-src` leaves out `data:` and `blob:` does not
stop it. An image made from a `Blob` (`getImage(blob)`, and every transform given a `Blob` or `File`) has already
released its object URL: it draws and converts as usual, but its `src` loads nothing more, so show the `Blob` through
a URL of your own.
