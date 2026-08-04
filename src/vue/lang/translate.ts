import { formatText, type IFormatInput } from "./formatText"

export type ITranslationMessage = Record<string, string> | string
export type ITranslationMessages = Record<string, ITranslationMessage>

export function translate(key: string, values: ITranslationMessages, langCode: string, formatArgs?: IFormatInput): string {
    if (values == null) {
        return key
    }

    const message = values[key]
    if (message == null) {
        console.warn(`translate: ${key} not found`, { values, langCode })
        return key
    }

    return translateMessage(message, langCode, formatArgs)
}
export function translateMessage(message: ITranslationMessage, langCode: string, formatArgs?: IFormatInput): string {
    // use fallback language when culture (e.g. en-US) is not present in translation messages
    let output = typeof message == "string" ? message : (message[langCode] ?? message[langCode.substring(0, 2)]!)

    // if (output == null) {
    //     // return first translated property when chosen language is not present
    //     output = Object.values(message)[0] as string
    // }

    if (formatArgs != null) {
        output = formatText(output, formatArgs)
    }
    return output
}

export default translate
