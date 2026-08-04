import { stringifyDate } from "../utilities/datetime-utility"

export default {
    use() {
        Date.prototype.toJSON = function (): string {
            return stringifyDate(this) ?? ""
        }
    },
}
