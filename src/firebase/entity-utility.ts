import communicator from "./communicator"
import { trimRight } from "../utilities/string-utility"

function getCatalogItemUrl(url: string, catalogName: string, id: string | number): string {
    return `${trimRight(url, "/")}/${catalogName}/${id}.json`
}
function getCatalogUrl(url: string, catalogName: string): string {
    return `${trimRight(url, "/")}/${catalogName}.json`
}

// Entities
export async function details(apiUrl: string, catalogName: string, id: string | number) {
    const url = id ? getCatalogItemUrl(apiUrl, catalogName, id) : getCatalogUrl(apiUrl, catalogName)
    return communicator.get(url)
}
export async function list(apiUrl: string, catalogName: string) {
    const url = getCatalogUrl(apiUrl, catalogName)
    const result = (await communicator.get(url)) as Record<string, Record<string, unknown>>
    const items = Object.entries(result).map((entry) => ({
        ...(entry[1] as object), // value -> item
        id: entry[0], // key -> id
    }))
    items.sort((x1, x2) => (x1 as unknown as Record<string, number>).sortOrder - (x2 as unknown as Record<string, number>).sortOrder)
    return items
}
export async function saveEntity(apiUrl: string, catalogName: string, item: Record<string, unknown>) {
    const isNew = !item.id
    const url = isNew ? getCatalogUrl(apiUrl, catalogName) : getCatalogItemUrl(apiUrl, catalogName, item.id as string | number)
    const method = isNew ? "post" : "put"
    return communicator[method](url, item)
}
export async function deleteEntity(apiUrl: string, catalogName: string, item: Record<string, unknown>) {
    const url = getCatalogItemUrl(apiUrl, catalogName, item.id as string | number)
    return communicator.delete(url)
}
export async function importEntities(apiUrl: string, catalogName: string, items: Record<string, unknown>[]) {
    return [...items].map(async (item, index) => {
        item.sortOrder = index
        return await saveEntity(apiUrl, catalogName, item)
    })
}

// utility object
export default {
    details,
    list,
    saveEntity,
    deleteEntity,
    importEntities,
}
