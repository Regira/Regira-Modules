import type { IServiceProvider } from "../../ioc"
import type { IConfig, IEntity, IEntityService } from "../abstractions"

type IEntityControls = { Overview?: any; Details?: any; Form?: any; Fiche?: any }

export interface IEntityDescriptor<T extends IEntity = IEntity> extends IEntityControls {
    Entity: { name: string; new (): T }
    serviceBuilder: (sp: IServiceProvider) => IEntityService<T>

    config: IConfig

    get key(): string
}

export class EntityDescriptor<T extends IEntity = IEntity> {
    Entity: { name: string; new (): T }
    serviceBuilder: (sp: IServiceProvider) => IEntityService<T>

    config: IConfig
    Overview?: any
    Details?: any
    Form?: any
    Fiche?: any

    constructor(
        Entity: { name: string; new (): T },
        serviceBuilder: (sp: IServiceProvider) => IEntityService<T>,
        config: IConfig,
        { Overview, Details, Form, Fiche }: IEntityControls
    ) {
        this.Entity = Entity
        this.serviceBuilder = serviceBuilder
        this.config = config
        this.Overview = Overview
        this.Details = Details
        this.Form = Form
        this.Fiche = Fiche
    }

    get key() {
        return this.Entity.name
    }
}

export default EntityDescriptor
