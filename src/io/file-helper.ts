import axios from "axios"
import fileUtility from "../utilities/file-utility"
import { isUrl } from "../utilities/string-utility"

class FileHelper {
    async getBlob(input: File | Blob | string, filename?: string, type?: string): Promise<Blob> {
        if (input instanceof File) {
            // make sure a blob is returned (name property of File is read-only)
            return fileUtility.fileToBlob(input, filename, type)
        }

        if (input instanceof Blob) {
            const blob = input as Blob & { name?: string }
            if (filename && blob.name !== filename) {
                blob.name = filename
            }
            return blob
        }

        if (typeof input === "string") {
            // url
            if (isUrl(input)) {
                return fileUtility.urlToBlob(input, filename)
            }
            // base64
            return fileUtility.base64ToBlob(input, filename ?? "", type)
        }

        throw Error("Cannot convert input to type Blob")
    }

    async getBase64Url(input: File | Blob | string) {
        const blob = await this.getBlob(input)
        return fileUtility.blobToBase64(blob)
    }
    async createUrl(input: File | Blob | string) {
        const blob = await this.getBlob(input)
        return fileUtility.blobToBase64(blob)
    }
    async browse(options: { multiple?: boolean; accept?: string | string[] } = {}) {
        return new Promise<File[]>(function (resolve) {
            const input = document.createElement("input") as HTMLInputElement
            input.setAttribute("type", "file")

            if (options.multiple == null || options.multiple) {
                input.setAttribute("multiple", "true")
            }
            if (options.accept) {
                input.setAttribute("accept", Array.isArray(options.accept) ? options.accept.join(",") : options.accept)
            }

            input.value = ""
            input.setAttribute("style", "display: none;")
            function changeListener(this: HTMLInputElement) {
                const files = [...(this.files ?? [])]
                input.removeEventListener("change", changeListener)
                document.body.removeChild(input)
                resolve(files)
            }
            input.addEventListener("change", changeListener)
            document.body.appendChild(input)
            input.click()
        })
    }
    async readJson(blob: Blob) {
        const content = await fileUtility.readAllText(blob)
        try {
            return JSON.parse(content)
        } catch (ex) {
            console.error("Could not parse blob to JSON", {
                blob,
                content,
                error: ex,
            })
            throw ex
        }
    }
    async writeJson(object: unknown, filename: string) {
        const json = JSON.stringify(object, null, 2)
        const blob = fileUtility.writeAllText(json, filename, "application/json")
        return blob
    }
    async send(
        url: string,
        files: Blob[],
        data: Record<string, unknown> = {},
        options: { method?: string; headers?: Record<string, string>; filesParameterName?: string } = {}
    ) {
        const { method = "POST", headers: extraHeaders, filesParameterName } = options
        const formData = fileUtility.toFormData(files || [], data || {}, filesParameterName ? { filesParameterName } : {})

        const headers = {
            "Content-Type": "multipart/form-data",
            ...(extraHeaders || {}),
        }

        return axios({
            method: method,
            url,
            data: formData,
            headers,
        })
    }
    async saveAs(input: File | Blob | string, type?: string, filename?: string) {
        const namedInput = input as Partial<File>
        const blob = await this.getBlob(input, filename || namedInput.name, type || namedInput.type)
        return fileUtility.saveAs(blob, (blob as Blob & { name?: string }).name || "file")
    }
}

export default FileHelper
