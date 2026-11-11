export const DEFAULT_PAGESIZE = 10

export interface IPagingInfo {
    pageSize?: number
    page?: number
}

export class PagingInfo implements IPagingInfo {
    page: number = 1
    pageSize: number = DEFAULT_PAGESIZE

    constructor(pageSize = DEFAULT_PAGESIZE, page = 1) {
        this.pageSize = pageSize
        this.page = page
    }
}

export default PagingInfo
