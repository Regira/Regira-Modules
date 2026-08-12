import { EntityBase } from "@regira/modules/vue/entities"

export class __Entity__ extends EntityBase {
    id: number = 0 // Guid/string-keyed API entity → `id: string = ""`; the rest of the entity slice is key-generic (owned child rows stay int)
    title = "" // placeholder label — rename/remove it here AND in the (c) views that bind it (Form, List/ListItem, SelectorList)
    // TODO: your fields — initialize non-optional ones (strictPropertyInitialization); optional ones get `?`, e.g.
    // code?: string
    // barId?: number
    // bar?: Bar                          // a related entity — import another slice's model ALIASED:
    //                                    //   import type { Entity as Bar } from "@/entities/bars"
    //                                    //   (barrels export the model as `Entity`; `{ Bar }` is the TS2305 trap)
    //                                    // `import type`, not `import { type … }`: the inline form survives to
    //                                    // runtime and two slices referencing each other then cycle through
    //                                    // store.ts's Entity.name — dev-server only, build stays green
    // status?: Status                    // mirror a C# enum as a const object + union type, never a TS `enum`
    //                                    // (erasableSyntaxOnly rejects enums — see entities.setup.md → Tooling)
    // ⚠️ fields the API projects must be plain assignable properties — a class getter named after a
    //    JSON key (a `get fullName()` mirroring a projected fullName) makes hydration throw at runtime;
    //    vue-tsc stays green

    created?: Date
    lastModified?: Date

    override get $id(): string | number {
        return this.id || "new" // "new" (or null) marks an unsaved instance → save() inserts
    }
    override get $title(): string | undefined {
        return this.title // TODO: the human label (selectors, breadcrumbs, nav)
    }
}

export const Entity = __Entity__ // the barrel name other slices import — `import type { Entity as __Entity__ } from "@/entities/__entities__"`, never `{ __Entity__ }`
export default __Entity__
