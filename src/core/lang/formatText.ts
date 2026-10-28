type IFormatValueInput = string | number | Date | undefined
type IFormatFunctionInput = (input: string) => string
export type IFormatInput = Record<string, IFormatValueInput> | IFormatFunctionInput
export type FormatTextOptions = {
    /** match a placeholder to its arg whatever the case of either name: `{MaxLength}` takes `maxLength` */
    ignoreCase?: boolean
}

export function formatText(input: string, formatArgs: IFormatInput, options: FormatTextOptions = {}): string {
    if (typeof formatArgs == "function") {
        return (formatArgs as IFormatFunctionInput)(input)
    }

    const names = options.ignoreCase ? new Map(Object.keys(formatArgs).map((name) => [name.toLowerCase(), name])) : undefined
    // a placeholder without an arg stays as written; only the args' own names count, so `{constructor}` is no arg
    return input.replace(/\{([^{}]+)\}/g, (placeholder, key: string) => {
        const name = names ? names.get(key.toLowerCase()) : key
        return name != null && Object.prototype.hasOwnProperty.call(formatArgs, name) ? getParamValue(formatArgs[name]) : placeholder
    })
}
function getParamValue(input: IFormatValueInput): string {
    return input?.toString() ?? ""
}

export default formatText
