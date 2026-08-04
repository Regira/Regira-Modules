import { details, list, saveEntity, deleteEntity, importEntities } from "./entity-utility"

class EntityService {
    apiUrl: string
    catalogName: string
    constructor({ catalogName, apiUrl }: { catalogName: string; apiUrl: string }) {
        this.apiUrl = apiUrl
        this.catalogName = catalogName
    }

    async details(id: string | number) {
        return details(this.apiUrl, this.catalogName, id)
    }
    async list() {
        return list(this.apiUrl, this.catalogName)
    }
    async save(item: Record<string, unknown>) {
        return saveEntity(this.apiUrl, this.catalogName, item)
    }
    async delete(item: Record<string, unknown>) {
        return deleteEntity(this.apiUrl, this.catalogName, item)
    }
    async import(items: Record<string, unknown>[]) {
        return importEntities(this.apiUrl, this.catalogName, items)
    }
}

export default EntityService
