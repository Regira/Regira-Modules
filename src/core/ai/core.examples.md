# Regira Core — Examples

Verify signatures in [core.signatures.md](core.signatures.md). These are for an app without Vue; a Vue app
follows the `vue/*` guides instead.

## Startup: the axios instance and the services

```ts
import { initAxios, defaultServiceProvider } from "@regira/modules/core"

const appConfig = await fetch("/config.json").then((r) => r.json())
const axios = initAxios({ api: appConfig.api, includeCredentials: appConfig.includeCredentials })

defaultServiceProvider.add("axios", () => axios)
```

## A model and its service

```ts
import { EntityBase, EntityServiceBase, defaultServiceProvider, get, type AxiosWithFilesInstance, type IConfig } from "@regira/modules/core"

export class Product extends EntityBase {
    id = 0
    title = ""
    get $id() {
        return this.id
    }
    get $title() {
        return this.title
    }
}

export const productConfig: IConfig = { key: "product", routePrefix: "products", api: "product", defaultPageSize: 20 }

export class ProductService extends EntityServiceBase<Product> {
    toEntity(item: object): Product {
        return Object.assign(new Product(), item)
    }
}

defaultServiceProvider.add(ProductService, (sp) => new ProductService(sp.get<AxiosWithFilesInstance>("axios")!, productConfig))

const products = get<ProductService>(ProductService)!
const { items, count } = await products.search({ q: "chair", page: 1, pageSize: 20 })
```

## Showing what a failed save tells the user

```ts
import { toFeedbackError, fieldMessages, fieldLabel } from "@regira/modules/core"

try {
    await products.save(product)
} catch (ex) {
    console.error("saving failed", ex)
    const error = toFeedbackError(ex) // { title: ["Required"] }, the server's own text, or undefined
    const titleMessages = fieldMessages(error, "title") // ["Required"]
    const heading = fieldLabel("categoryId") // "Category"
}
```

## Translating validation messages

```ts
import { setErrorTranslator, translate, formatText, type ITranslationMessages } from "@regira/modules/core"

const messages: ITranslationMessages = {
    Required: { en: "This field is required", nl: "Dit veld is verplicht" },
    MaxLength: { en: "At most {MaxLength} characters", nl: "Hoogstens {MaxLength} tekens" },
}
// once at startup — without it, messages show as the server sent them
setErrorTranslator((key, args) =>
    messages[key] == null
        ? undefined
        : translate(key, messages, "en", (text) => formatText(text, args as Record<string, string>, { ignoreCase: true }))
)
```

## Signing in

```ts
import { AuthService, LocalStorageTokenManager, registerCredentialUrls } from "@regira/modules/core"

const tokens = new LocalStorageTokenManager("myapp")
const auth = new AuthService(axios, tokens, { clientApp: "backoffice" })
registerCredentialUrls("users/*/password") // never log the body of this app endpoint either

const authData = await auth.login(username, password)
if (authData.hasPermission("products.write")) {
    // …
}
```
