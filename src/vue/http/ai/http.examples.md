# Regira HTTP — Examples

Verify signatures in [http.signatures.md](http.signatures.md).

## Initialize at startup

```ts
import { initAxios } from "@regira/modules/vue/http"
import { plugin as servicesPlugin } from "@regira/modules/vue/ioc"

const appConfig = await fetch("/config.json").then((r) => r.json())
const axios = initAxios({ api: appConfig.api, includeCredentials: appConfig.includeCredentials })

// register the one instance so services and the auth plugin share it
app.use(servicesPlugin, { configure: (sp) => sp.add("axios", () => axios) })
```

## Use it later

```ts
import { useAxios } from "@regira/modules/vue/http"

const axios = useAxios() // the singleton (throws if initAxios hasn't run)
const { data } = await axios.get("/products")
```

## Download a file

```ts
import { useAxios } from "@regira/modules/vue/http"

const blob = await useAxios().getFile(`/products/${id}/export`) // filename/type resolved from headers
const url = URL.createObjectURL(blob)
// trigger a download with (blob as any).name as the suggested filename, then URL.revokeObjectURL(url)
```

## Upload files

```ts
import { useAxios } from "@regira/modules/vue/http"

await useAxios().upload("/products/import", files, {
    filesParameterName: "files", // default is "file"
    data: { overwrite: true }, // extra multipart fields
})
```

## Build a query string

```ts
import { createQueryString } from "@regira/modules/vue/http"

const qs = createQueryString({ q: "blue", includes: ["Facets", "Components"], pageSize: 10 })
// => q=blue&includes=Facets&includes=Components&pageSize=10
const { data } = await useAxios().get(`/products/search?${qs}`)
```

## See also

- [http.instructions.md](http.instructions.md) · [http.signatures.md](http.signatures.md)
