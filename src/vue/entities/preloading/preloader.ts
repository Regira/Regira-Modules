import type { EntityBase, IEntity, IEntityService } from "../abstractions"
import usePooling from "../pooling"
import { get } from "../../ioc"
import type { App } from "vue"

const preloaderTypes: Array<string> = []
const promises: Array<Promise<any>> = []

function preload(types: Array<EntityBase & { name: string }>) {
    // clear first
    promises.length = 0
    preloaderTypes.length = 0
    for (let type of types) {
        preloaderTypes.push(type.name)
        const entityService = get<IEntityService<IEntity>>(type.name)!
        const { list } = usePooling(entityService, type.name, undefined, true)
        const result = list({ pageSize: 0 })
        promises.push(result)
    }

    return ready()
}
async function ready() {
    return await new Promise((resolve) => {
        // when preloaderTypes are defined, but promises is still empty -> wait and try again
        async function checkReady() {
            if (preloaderTypes.length > promises.length) {
                setTimeout(checkReady, 50)
                return
            }
            const result = await Promise.allSettled(promises)
            resolve(result)
        }

        checkReady()
    })
}

export const plugin = {
    install(_: App) {},
    preload,
    ready,
}

export function usePreloader() {
    return { preload, ready }
}

export default plugin
