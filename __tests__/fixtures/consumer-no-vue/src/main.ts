// An app without Vue, using the core the way a React or plain TypeScript app would. It is type-checked with
// skipLibCheck off, so a declaration that reaches for a Vue type fails here.
import {
    EntityBase,
    EntityServiceBase,
    ServiceProvider,
    defaultServiceProvider,
    initAxios,
    createQueryString,
    toFeedbackError,
    fieldMessages,
    setErrorTranslator,
    translate,
    formatDate,
    AuthService,
    MemoryTokenManager,
    type IConfig,
    type IEntity,
    type FeedbackError,
} from "@regira/modules/core"
import { groupBy } from "@regira/modules/utilities/array-utility"

class Product extends EntityBase implements IEntity {
    id = 0
    title = ""
    get $id() {
        return this.id
    }
    get $title() {
        return this.title
    }
}

const config: IConfig = { key: "product", routePrefix: "products", api: "product" } as IConfig
const axios = initAxios({ api: "https://example.test/api/" })

class ProductService extends EntityServiceBase<Product> {
    constructor() {
        super(axios, config)
    }
    toEntity(item: object): Product {
        return Object.assign(new Product(), item)
    }
}

const services = new ServiceProvider().add(ProductService, () => new ProductService())
defaultServiceProvider.add(ProductService, () => services.get<ProductService>(ProductService) ?? new ProductService())

setErrorTranslator((key) => translate(key, { Required: { en: "Fill this in" } }, "en"))
const error: FeedbackError | undefined = toFeedbackError({ response: { status: 400, data: { errors: { Title: ["Required"] } } } })
const auth = new AuthService(axios, new MemoryTokenManager(undefined))

document.body.textContent = [
    services.get<ProductService>(ProductService) != null,
    fieldMessages(error, "title").join(),
    formatDate(new Date(2026, 0, 2)),
    createQueryString({ q: "x" }).toString(),
    Object.keys(groupBy([new Product()], (p) => p.title)).length,
    auth.options.clientApp ?? "",
].join(" | ")
