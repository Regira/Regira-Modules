export interface ISortByInfo {
    sortBy: string | Array<string>
}

export class SortByInfo implements ISortByInfo {
    sortBy: string | Array<string> = ""
}

export default SortByInfo
