type IFormatValueInput = string | number | Date | undefined
type IFormatFunctionInput = (input: string) => string
export type IFormatInput = Record<string, IFormatValueInput> | IFormatFunctionInput

export function formatText(input: string, formatArgs: IFormatInput): string {
    if (typeof formatArgs == "function") {
        return (formatArgs as IFormatFunctionInput)(input)
    }

    let translation = input
    const translationParams = extractParams(input)

    translationParams?.forEach((key) => {
        if (key in formatArgs) {
            const paramValue = getParamValue(formatArgs[key])
            const pattern = new RegExp(`{${key}}`, "g")
            translation = translation.replace(pattern, paramValue)
        }
    })

    return translation
}
function extractParams(input: string): Array<string> {
    const regex = /\{([^{}]+)\}/g
    const formatArgs = []
    let match
    while ((match = regex.exec(input)) !== null) {
        formatArgs.push(match[1]!)
    }

    return formatArgs
}
function getParamValue(input: IFormatValueInput): string {
    return input?.toString() ?? ""
}

export default formatText
