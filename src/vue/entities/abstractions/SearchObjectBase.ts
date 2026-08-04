import type { ISearchObject } from "../../entities"

export abstract class SearchObjectBase implements ISearchObject {
    q?: string

    // toJSON() {
    //     // exclude $meta from json
    //     const jsonObj = Object.fromEntries(Object.entries(this).filter(([key]) => key[0] != "$"))
    //     return JSON.stringify(jsonObj)
    // }
}

export class DefaultSearchObject extends SearchObjectBase {}

export default SearchObjectBase
