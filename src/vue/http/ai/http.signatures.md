# Regira HTTP — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/http`. Do not guess — look up here first.

```ts
import { initAxios, useAxios, getFile, upload, createQueryString, type AxiosWithFilesInstance } from "regira/vue/http"
```

## Axios instance

```ts
export interface AxiosWithFilesInstance extends AxiosInstance {
    getFile(url: string, method?: string, filename?: string, type?: string): Promise<Blob>
    upload(url: string, files: Array<Blob>, options?: UploadOptions): Promise<AxiosResponse>
}

export function initAxios(config: { api: string; includeCredentials?: boolean }): AxiosWithFilesInstance
export function useAxios(): AxiosWithFilesInstance // throws if initAxios has not been called
```

## File helpers

```ts
export function getFile(url: string, method?: string, filename?: string, type?: string): Promise<Blob>

// UploadOptions is not exported; this is its shape:
type UploadOptions = Record<string, unknown> & {
    method?: string // default "POST"
    headers?: Record<string, string>
    data?: Record<string, unknown> // extra multipart fields
    filesParameterName?: string // default "file"
}
export function upload(url: string, files: Array<Blob>, options?: UploadOptions): Promise<AxiosResponse>
```

## Query string

```ts
export function createQueryString(o: object): URLSearchParams // array values → repeated keys; Date → ISO-8601 + local offset; invalid Date → key omitted
```

## See also

- [http.instructions.md](http.instructions.md) · [http.examples.md](http.examples.md)
