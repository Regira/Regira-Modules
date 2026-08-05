# Regira IO — API Signatures Reference

Verbatim TypeScript signatures for `@regira/modules/io`. Do not guess — look up here first.

```ts
import { FileHelper, ImageHelper } from "@regira/modules/io"
```

## FileHelper

```ts
declare class FileHelper {
    getBlob(input: File | Blob | string, filename?: string, type?: string): Promise<Blob>
    getBase64Url(input: File | Blob | string): Promise<string>
    createUrl(input: File | Blob | string): Promise<string>
    browse(options?: { multiple?: boolean; accept?: string | string[] }): Promise<File[]>
    readJson(blob: Blob): Promise<any>
    writeJson(
        object: unknown,
        filename: string
    ): Promise<
        Blob & {
            name: string
        }
    >
    send(
        url: string,
        files: Blob[],
        data?: Record<string, unknown>,
        options?: {
            method?: string
            headers?: Record<string, string>
            filesParameterName?: string
        }
    ): Promise<import("axios").AxiosResponse<any, any, {}>>
    saveAs(input: File | Blob | string, type?: string, filename?: string): Promise<void>
}
export default FileHelper
```

## ImageHelper

```ts
type ImageInput = HTMLImageElement | string | Blob | HTMLCanvasElement // not exported
declare class ImageHelper extends FileHelper {
    getImage(input: ImageInput): Promise<HTMLImageElement>
    getBlob(input: HTMLImageElement | HTMLCanvasElement | File | Blob | string, filename?: string, type?: string): Promise<Blob>
    resize(
        input: ImageInput,
        max: number,
        options?: {
            quality?: number
            type?: string
        }
    ): Promise<HTMLImageElement>
    rotate(input: Blob, direction: number): Promise<HTMLImageElement>
    flipHorizontally(input: ImageInput): Promise<HTMLImageElement>
    flipVertically(input: ImageInput): Promise<HTMLImageElement>
    flipFlop(input: ImageInput, flip?: boolean, flop?: boolean, type?: string): Promise<HTMLImageElement>
    convertType(input: ImageInput, targetType: string): Promise<HTMLImageElement>
    getLightness(input: ImageInput): Promise<number>
    white2transparent(input: ImageInput, tolerance?: number): Promise<HTMLImageElement>
}
export default ImageHelper
```

## Package exports

```ts
export { default as FileHelper } from "./file-helper"
export { default as ImageHelper } from "./image-helper"
declare const _default: {
    FileHelper: typeof FileHelper
    ImageHelper: typeof ImageHelper
}
export default _default
```

## See also

- [io.instructions.md](io.instructions.md) — usage guide and gotchas
