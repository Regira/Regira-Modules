import type { Ref } from "vue"
import type { IEntity, IEntityService, IPagingInfo, ISearchObject, SearchResult } from "../abstractions"
import type { IPoolCache } from "./PoolCache"

export interface IPoolService<T extends IEntity> extends IEntityService<T> {
    get(input: T): Ref<T> | undefined
    getMany(input: Array<T>): Array<Ref<T>>
}

export class PoolService<T extends IEntity> implements IPoolService<T> {
    constructor(
        private service: IEntityService<T>,
        private cache: IPoolCache,
        private type: string
    ) {}

    async details(id: string | number, so?: ISearchObject): Promise<T | undefined> {
        const item = await this.service.details(id, so)
        if (item == null) {
            return undefined
        }
        this.cache.set(this.toEntity({ ...item }))
        return this.toEntity({ ...item })
    }
    async list(so?: object | undefined): Promise<Array<T>> {
        const items = await this.service.list(so)
        items.forEach((item) => this.cache.set(this.toEntity({ ...item })))
        return items
    }
    async search(so?: object | undefined): Promise<SearchResult<T>> {
        const { items, count } = await this.service.search(so)
        items.forEach((item) => this.cache.set(this.toEntity({ ...item })))
        return { items, count }
    }
    async searchUnion(searchObjects: Array<object>, pagingInfo?: IPagingInfo): Promise<SearchResult<T>> {
        const { items, count } = await this.service.searchUnion(searchObjects, pagingInfo)
        items.forEach((item) => this.cache.set(this.toEntity({ ...item })))
        return { items, count }
    }
    async save(item: T): Promise<{ saved: T; isNew: boolean }> {
        const { saved, isNew } = await this.service.save(item)
        this.cache.set(this.toEntity({ ...saved }))
        return { saved, isNew }
    }
    async remove(item: T): Promise<void> {
        await this.service.remove(item)
        this.cache.remove(item)
    }

    get(item: T): Ref<T> | undefined {
        const entity = this.toEntity(item)
        return this.cache.get<T>(this.type, entity.$id) || this.cache.set(entity)
    }
    getMany(items: Array<T>): Array<Ref<T>> {
        return items.map((item) => this.get(item)).filter((x) => x != null) as Array<Ref<T>>
    }

    set(item: T): Ref<T> {
        item = this.toEntity(item)
        return this.cache.set<T>(item)
    }
    setMany(items: Array<T>): Array<Ref<T>> {
        return items.map((item) => this.set(item))
    }

    toEntity(item: object) {
        return this.service.toEntity(item)
    }
    newEntity(values?: Record<string, any> | undefined): Promise<T> {
        return this.service.newEntity(values)
    }
}

export default PoolService
