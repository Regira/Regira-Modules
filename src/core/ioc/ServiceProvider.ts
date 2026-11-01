export interface IServiceProvider {
    get<T = any>(key: any): T | undefined
    add<T = any>(key: any, factory: (sp: IServiceProvider) => T): IServiceProvider
}

export class ServiceProvider implements IServiceProvider {
    services: Map<any, (sp: IServiceProvider) => any>
    constructor() {
        this.services = new Map<any, (sp: IServiceProvider) => any>()
    }

    get<T = any>(key: any): T | undefined {
        const factory = this.services.get(key)
        if (factory == null) {
            return undefined
        }
        return factory(this) as T
    }
    add<T = any>(key: any, factory: (sp: IServiceProvider) => T): IServiceProvider {
        this.services.set(key, factory)
        return this
    }
}

const defaultServiceProvider: IServiceProvider = new ServiceProvider()

export function get<T>(key: any): T | undefined {
    return defaultServiceProvider.get<T>(key)
}

export default defaultServiceProvider
