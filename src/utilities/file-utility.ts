import { toArray, last, skip, take } from "./array-utility"
import { flattenObject } from "./object-utility"

type NamedBlob = Blob & { name: string }

function base64StringToBlob(byteString: string, type: string): Blob {
    const bytes = Uint8Array.from(byteString, (c) => c.charCodeAt(0))
    return new Blob([bytes], { type })
}

export const browse = ({ multiple, accept }: { multiple?: boolean; accept?: string | string[] } = {}) => {
    return new Promise<File[]>(function (resolve) {
        const input = document.createElement("input") as HTMLInputElement
        input.setAttribute("type", "file")

        if (multiple == null || multiple) {
            input.setAttribute("multiple", "true")
        }
        if (accept != null) {
            input.setAttribute("accept", Array.isArray(accept) ? accept.join(",") : accept)
        }

        input.value = ""
        input.setAttribute("style", "display: none;")
        function changeListener() {
            const files = [...input.files!]
            input.removeEventListener("change", changeListener)
            document.body.removeChild(input)
            resolve(files)
        }
        input.addEventListener("change", changeListener)
        input.addEventListener("cancel", () => resolve([]))
        document.body.appendChild(input)
        input.click()
    })
}

export const isFile = (item: unknown): item is Blob => item != null && item instanceof Blob
export const createUrl = (blob: Blob): string => URL.createObjectURL(blob)
export const revokeUrl = (url: string): void => URL.revokeObjectURL(url)
export const getFilename = (uri: string): string | undefined => {
    if (!uri || !uri.includes("/")) {
        return uri
    }
    if (uri.endsWith("/")) {
        throw new Error("filename cannot end with a '/'")
    }
    return last(uri.split("/").filter((x) => !!x))
}
export const getExtension = (filename: string): string => {
    const filenameSegments = filename.split(".")
    const filenameSegmentsWithoutFirst = skip(filenameSegments, 1)
    const ext = last(filenameSegmentsWithoutFirst)
    return ext ? "." + ext : ""
}
export const getFilenameWithoutExtension = (uri: string | undefined): string | undefined => {
    if (!uri) {
        return undefined
    }

    const filename = getFilename(uri)
    if (!filename || !filename.includes(".")) {
        return filename
    }
    const filenameSegments = filename.split(".")
    return take(filenameSegments, filenameSegments.length - 1 || 1).join(".")
}
export const toFormData = (
    files: Blob[],
    data: Record<string, unknown>,
    { filesParameterName = "files" }: { filesParameterName?: string } = {}
): FormData => {
    const formData = toArray(files).reduce((r: FormData, f: Blob) => {
        r.append(filesParameterName, f, (f as File).name)
        return r
    }, new FormData())
    const flattenedData = flattenObject(data) as Record<string, string>
    return Object.entries(flattenedData).reduce((r: FormData, e) => {
        r.append(e[0], e[1])
        return r
    }, formData)
}

export const fileToBlob = async (file: File, filename?: string, type?: string): Promise<NamedBlob> => {
    // a File is already a Blob; re-wrap it so the (otherwise read-only) name can be set
    const blob = new Blob([file], { type: type ?? file.type }) as NamedBlob
    blob.name = filename ?? file.name
    return blob
}
export const base64ToBlob = (base64: string, filename: string, type?: string): NamedBlob => {
    const hasType = base64.slice(0, 100).includes(",")
    const input = hasType ? base64.slice(base64.indexOf(",") + 1) : base64

    if (!type && hasType) {
        type = base64.slice(0, base64.indexOf(",")).split(":")[1]!.split(";")[0]
    }

    const decodedInput = atob(input)

    const blob = base64StringToBlob(decodedInput, type ?? "") as NamedBlob
    blob.name = filename
    return blob
}
export const urlToBlob = async (url: string, filename?: string): Promise<NamedBlob> => {
    const response = await fetch(url)

    // try to get filename from content-disposition header
    const disposition = response.headers.get("content-disposition")
    if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        const matches = filenameRegex.exec(disposition)
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "")
        }
    }

    const blob = (await response.blob()) as NamedBlob

    if (filename) {
        blob.name = filename
    }
    return blob
}
export const blobToBase64 = async (blob: Blob): Promise<string> => {
    return new Promise(function (resolve) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target!.result as string)
        reader.readAsDataURL(blob)
    })
}

export const readAllText = async (blob: Blob): Promise<string> => blob.text()
export const writeAllText = (content: string, filename?: string, type?: string): NamedBlob => {
    const blob = new Blob([content], { type }) as NamedBlob
    if (filename) {
        blob.name = filename
    }
    return blob
}

export const saveAs = (blob: Blob & { name?: string }, filename?: string): void => {
    // Every browser this library targets supports the anchor `download` attribute
    // and Blob object URLs, so the old FileSaver.js fallbacks are no longer needed.
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename ?? blob.name ?? "file"
    link.rel = "noopener"
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()
    link.remove()
    // release the object URL once the download has had a chance to start
    setTimeout(() => URL.revokeObjectURL(url), 40000)
}

export const formatFileSize = (bytes: number, si = true, dp = 1): string => {
    // https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
    const thresh = si ? 1000 : 1024

    if (Math.abs(bytes) < thresh) {
        return bytes + " B"
    }

    const units = si ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
    let u = -1
    const r = 10 ** dp

    do {
        bytes /= thresh
        ++u
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)

    return bytes.toFixed(dp) + " " + units[u]
}

export const dropHandler = (e: DragEvent): File[] => {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop

    // Prevent default behavior (Prevent file from being opened)
    e.preventDefault()

    const { dataTransfer } = e
    const droppedFiles: File[] = []

    if (dataTransfer?.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (dataTransfer.items[i]!.kind === "file") {
                const file = dataTransfer.items[i]!.getAsFile()
                if (file) droppedFiles.push(file)
            }
        }
    } else if (dataTransfer?.files) {
        // Use DataTransfer interface to access the file(s)
        droppedFiles.push(...Array.from(dataTransfer.files))
    }

    return droppedFiles
}

// utility
export default {
    isFile,
    createUrl,
    revokeUrl,
    getFilename,
    getExtension,
    getFilenameWithoutExtension,
    toFormData,

    fileToBlob,
    base64ToBlob,
    urlToBlob,
    blobToBase64,

    readAllText,
    writeAllText,

    saveAs,

    formatFileSize,
}
