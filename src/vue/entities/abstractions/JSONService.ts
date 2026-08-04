import type { AxiosInstance } from "axios"
import { page, max, query } from "../../../utilities/array-utility"
import type { IConfig } from "./IConfig"
import { type IEntity, isNewEntity } from "./IEntity"
import EntityServiceBase from "./EntityServiceBase"
import type { SearchResult } from "./IEntityService"
import type { ISearchObject } from "./ISearchObject"
import type { IPagingInfo } from "./PagingInfo"
import type { ISortByInfo } from "./SortByInfo"

const cache = new Map<string, any>()

export abstract class JSONService<T extends IEntity> extends EntityServiceBase<T> {
    constructor(
        axios: AxiosInstance,
        config: IConfig,
        protected key: string
    ) {
        super(axios, config)
    }

    get cachedItems(): Array<T> {
        return cache.get(this.key) || undefined
    }
    set cachedItems(value: Array<T>) {
        cache.set(this.key, value)
    }

    async fetchJSONItems(): Promise<Array<T>> {
        if (this.cachedItems == null) {
            this.cachedItems = await super.list()
        }
        return this.cachedItems
    }

    override async details(id: string | number): Promise<T | undefined> {
        const item = (await this.list({ pageSize: 0 })).find((x) => x.$id == id) || undefined
        if (item != null) {
            return this.toEntity(item)
        }
        return undefined
    }
    /** `sortBy` is accepted for signature parity with the base but ignored: ordering here is the JSON document's own. */
    public override async list(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<T[]> {
        const searchObject = this.processSearchObject(so)
        const items = query(await this.fetchJSONItems(), searchObject as unknown as Partial<T>)
        const pageSize = typeof so?.pageSize === "undefined" ? this.config.defaultPageSize : so.pageSize
        return pageSize || 0 > 0 ? page(items, pageSize, Math.max(so?.page || 0, 1) - 1) : items
    }
    /** `sortBy` is accepted for signature parity with the base but ignored (see `list`). */
    public override async search(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<SearchResult<T>> {
        const searchObject = this.processSearchObject(so)
        const count = query(await this.fetchJSONItems(), searchObject as unknown as Partial<T>).length
        return {
            items: await this.list(so),
            count,
        }
    }
    override async save(item: T): Promise<{ saved: T; isNew: boolean }> {
        const processedItem = this.processItem(item)!
        const isNew = isNewEntity(processedItem.$id)
        const items = await this.fetchJSONItems()
        if (isNew) {
            const newId = ((max(items, (x: T) => parseInt(x.$id.toString())) as number | undefined) ?? 0) + 1
            //processedItem.id = newId
            Object.defineProperty(processedItem, "id", { value: newId, enumerable: true, writable: true, configurable: true })
            this.cachedItems!.push(processedItem)
        } else {
            const index = items.findIndex((x) => x.$id == processedItem.$id)
            items.splice(index, 1, processedItem)
        }
        return { saved: this.toEntity(processedItem), isNew }
    }
    override async remove(item: T): Promise<void> {
        const index = this.cachedItems.findIndex((x) => x.$id == item.$id)
        if (index !== -1) {
            this.cachedItems.splice(index, 1)
        }
    }

    processSearchObject(so?: ISearchObject): ISearchObject {
        const {
            pageSize = 0,
            page = 0,
            q = "",
            ...searchObject
        } = {
            ...(so || {}),
            "*$title*": so?.q || undefined,
        }
        return Object.fromEntries(Object.entries(searchObject).filter(([, v]) => v != null))
    }
}

export default JSONService
