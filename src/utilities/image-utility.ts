import { getRgbString } from "./color-utility"
import fileUtility from "./file-utility"
import { isArray } from "./array-utility"

export const contentTypes = {
    jpg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
}
const DEFAULT_CONTENTTYPE = contentTypes.jpg

export const getImageContentType = async (img: HTMLImageElement): Promise<string | undefined> => {
    // https://stackoverflow.com/questions/18299806/how-to-check-file-mime-type-with-javascript-before-upload#answer-29672957
    const blob = await imageToBlob(img)
    const arr = new Uint8Array(await blob.arrayBuffer()).subarray(0, 4)
    let header = ""
    for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16)
    }
    switch (header) {
        case "89504e47":
            return contentTypes.png
        case "47494638":
            return contentTypes.gif
        case "ffd8ffe0":
        case "ffd8ffe1":
        case "ffd8ffe2":
        case "ffd8ffe3":
        case "ffd8ffe8":
            return contentTypes.jpg
        default:
            return undefined
    }
}
export const parseContentType = (type: string | undefined) => (type || contentTypes.jpg).replace("/jpg", "/jpeg")

export const createCanvas = (
    width: number,
    height: number,
    options: Record<string, unknown> | null = { backgroundColor: "#ffffff", imageSmoothingEnabled: false }
) => {
    const canvas = window.document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    if (options) {
        get2dContext(canvas, options)
    }
    return canvas
}
export const centerImageOnCanvas = (img: HTMLImageElement) => {
    const maxSize = Math.max(img.width, img.height)
    const canvas = createCanvas(maxSize, maxSize)
    return addImageToCanvas(canvas, img, { top: (maxSize - img.height) / 2, left: (maxSize - img.width) / 2 })
}
export const get2dContext = (canvas: HTMLCanvasElement, options?: Record<string, unknown> | null) => {
    const ctx = canvas.getContext("2d")!
    if (options != null) {
        Object.keys(options).forEach(function (x) {
            const option = options[x]
            if (option != null) {
                switch (x) {
                    case "backgroundColor":
                    case "background-color":
                        ctx.fillStyle = getRgbString(option as string, undefined) as string
                        ctx.fillRect(0, 0, canvas.width, canvas.height)
                        break
                    case "image":
                        ctx.drawImage(option as CanvasImageSource, 0, 0)
                        break
                    default:
                        ;(ctx as unknown as Record<string, unknown>)[x] = option
                }
            }
        })
    }
    return ctx
}
export const clearCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = get2dContext(canvas)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}
export const addImageToCanvas = (
    canvas: HTMLCanvasElement | null | undefined,
    img: HTMLImageElement,
    { top = 0, left = 0 } = { top: 0, left: 0 }
) => {
    const c = canvas ?? createCanvas(img.width + left, img.height + top)
    const ctx = c.getContext("2d")!
    ctx.drawImage(img, left, top, img.width, img.height)
    return c
}

export const urlToImage = async (url: string): Promise<HTMLImageElement> => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
    })
}
// the Blob each image of blobToImage was made from, while its src is still that Blob's URL: imageToBlob answers it
const sourceBlobs = new WeakMap<HTMLImageElement, { blob: Blob; url: string }>()
/**
 * The Blob as an image. Its object URL is released as soon as the image has loaded or failed to: a loaded image keeps
 * its pixels, so it draws and converts as before, but its `src` no longer loads anything — show the Blob through a URL
 * of your own (`URL.createObjectURL`), not through the image's `src`. {@link imageToBlob} answers the Blob itself.
 */
export const blobToImage = async (blob: Blob): Promise<HTMLImageElement> => {
    const url = fileUtility.createUrl(blob)
    try {
        const img = await urlToImage(url)
        sourceBlobs.set(img, { blob, url })
        return img
    } finally {
        fileUtility.revokeUrl(url)
    }
}
// a data URL's bytes, base64 or URL-encoded, without a request: a Content-Security-Policy's connect-src may refuse one
const dataUrlToBlob = (url: string, filename?: string): Blob & { name: string } => {
    const comma = url.indexOf(",")
    const meta = url.slice("data:".length, comma)
    const blob = (
        meta.endsWith(";base64")
            ? fileUtility.base64ToBlob(url, filename ?? "")
            : new Blob([decodeURIComponent(url.slice(comma + 1))], { type: meta.split(";")[0] })
    ) as Blob & { name: string }
    if (filename) {
        blob.name = filename
    }
    return blob
}
/**
 * The image's bytes as a Blob, without a request where the page holds them: an image of {@link blobToImage} answers the
 * Blob it was made from (unless another `type` is asked), and a `data:` source is decoded. Any other `blob:` source,
 * whose URL may be released, is drawn to a canvas and encoded as `type` (default `image/png`, which keeps transparency).
 * Any other URL is fetched.
 */
export const imageToBlob = async (img: HTMLImageElement, filename?: string, type?: string): Promise<Blob & { name: string }> => {
    const src = img.src
    const source = sourceBlobs.get(img)
    if (source != null && source.url === src && (!type || parseContentType(type) === source.blob.type)) {
        // a new Blob over the same bytes, so naming it leaves the caller's Blob (or File) alone
        const blob = new Blob([source.blob], { type: source.blob.type }) as Blob & { name: string }
        blob.name = filename ?? (source.blob as Blob & { name?: string }).name ?? ""
        return blob
    }
    if (src.startsWith("data:")) {
        return dataUrlToBlob(src, filename)
    }
    if (src.startsWith("blob:")) {
        const contentType = type ? parseContentType(type) : contentTypes.png
        const canvas = createCanvas(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            contentType === contentTypes.jpg ? { backgroundColor: "#ffffff" } : null
        )
        get2dContext(canvas).drawImage(img, 0, 0, canvas.width, canvas.height)
        const blob = (await canvasToBlob(canvas, contentType)) as (Blob & { name: string }) | null
        if (blob == null) {
            throw Error("Cannot convert image to Blob")
        }
        if (filename) {
            blob.name = filename
        }
        return blob
    }
    return fileUtility.urlToBlob(src, filename)
}
export const canvasToImage = async (canvas: HTMLCanvasElement, type = DEFAULT_CONTENTTYPE, quality = 1) => urlToImage(canvas.toDataURL(type, quality))
export const imageToCanvas = (img: HTMLImageElement, width?: number, height?: number) => {
    const canvas = createCanvas(width || img.width, height || img.height)
    const ctx = get2dContext(canvas)
    ctx.drawImage(img, 0, 0, width || img.width, height || img.height)
    return canvas
}
export const canvasToBlob = async (canvas: HTMLCanvasElement, type = DEFAULT_CONTENTTYPE, quality = 1) => {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
export const base64ToImage = async (data: string) => urlToImage(data)
export const imageToBase64 = (img: HTMLImageElement, type = DEFAULT_CONTENTTYPE, quality = 1) => {
    const canvas = imageToCanvas(img)
    return canvas.toDataURL(type, quality)
}

// the largest canvas side every browser draws: iOS Safari leaves a larger canvas blank
const MAX_CANVAS_SIDE = 4096

/**
 * The image scaled by `scale`, encoded as `type`. The browser does the scaling: a first draw takes the source straight to
 * a canvas no larger than 4096 px per side, and each further draw halves it, until the last one lands on the target
 * size, so a photo of any size scales smoothly. Transparency is kept for a type that has it; a JPEG gets a white
 * background.
 */
export const resizeByScale = async (
    img: HTMLImageElement,
    scale: number,
    { quality = 1, type = DEFAULT_CONTENTTYPE }: { quality?: number; type?: string } = {}
) => {
    const contentType = parseContentType(type || (await getImageContentType(img)))

    const targetWidth = Math.max(1, Math.floor(img.width * scale))
    const targetHeight = Math.max(1, Math.floor(img.height * scale))
    // the first step: the target doubled while it stays smaller than the source and within the canvas limit
    let width = targetWidth
    let height = targetHeight
    while (width * 2 < img.width && height * 2 < img.height && Math.max(width, height) * 2 <= MAX_CANVAS_SIDE) {
        width *= 2
        height *= 2
    }

    const draw = (source: CanvasImageSource, w: number, h: number, backgroundColor?: string) => {
        const canvas = createCanvas(w, h, null)
        const ctx = get2dContext(canvas, { backgroundColor, imageSmoothingEnabled: true, imageSmoothingQuality: "high" })
        ctx.drawImage(source, 0, 0, w, h)
        return canvas
    }
    // only the last canvas gets a JPEG's white background: the steps before it keep what is transparent
    const background = contentType === contentTypes.jpg ? "#ffffff" : undefined
    let canvas = draw(img, width, height, width === targetWidth ? background : undefined)
    while (width > targetWidth) {
        width /= 2
        height /= 2
        const next = draw(canvas, width, height, width === targetWidth ? background : undefined)
        // release the larger canvas now: a browser caps the memory of all its canvases together
        canvas.width = canvas.height = 0
        canvas = next
    }
    return canvasToImage(canvas, contentType, quality)
}
export const resize = async (
    img: HTMLImageElement,
    maxSize: number | [number, number],
    { quality = 1, type = DEFAULT_CONTENTTYPE }: { quality?: number; type?: string } = {}
) => {
    const { width: sourceWidth, height: sourceHeight } = img
    let [targetWidth = 0, targetHeight = targetWidth] = isArray(maxSize) ? maxSize : [maxSize, maxSize]

    if (targetWidth == 0) {
        // adjusted width, relative to height
        targetWidth = sourceWidth * (targetHeight / sourceHeight)
    }
    if (targetHeight == 0) {
        // adjusted height, relative to width
        targetHeight = sourceHeight * (targetWidth / sourceWidth)
    }

    // https://stackoverflow.com/questions/19262141/resize-image-with-javascript-canvas-smoothly#answer-19262385
    const targetCanvas = createCanvas(targetWidth, targetHeight)
    const targetCtx = get2dContext(targetCanvas, {
        imageSmoothingEnabled: false,
    })

    const factor = 0.5

    // step 1 - resize to 50%
    const helperCanvas = createCanvas(sourceWidth * factor, sourceHeight * factor)
    const helperCtx = get2dContext(helperCanvas, {
        imageSmoothingEnabled: false,
    })
    // step 2
    helperCtx.drawImage(img, 0, 0, sourceWidth * factor, sourceHeight * factor)
    // step 3, resize to final size
    targetCtx.drawImage(helperCanvas, 0, 0, sourceWidth * factor, sourceHeight * factor, 0, 0, targetWidth, targetHeight)

    const contentType = parseContentType(type || (await getImageContentType(img)))

    return canvasToImage(targetCanvas, contentType || contentTypes.png, quality)
}
export const rotate = async (img: HTMLImageElement, direction = 1, type = DEFAULT_CONTENTTYPE) => {
    const degrees = direction > 0 ? 90 : direction < 0 ? -90 : 0

    //get largest dimension (width, height)
    const maxDimension = Math.max(img.width, img.height)

    //get original dimensions
    const originalWidth = img.naturalWidth
    const originalHeight = img.naturalHeight

    //calculate dimensions for rotated image
    const newWidth = degrees !== 0 ? originalHeight : originalWidth
    const newHeight = degrees !== 0 ? originalWidth : originalHeight

    const contentType = parseContentType(type || (await getImageContentType(img)))

    //rotate img on canvas
    const canvas = createCanvas(maxDimension, maxDimension)
    const ctx = get2dContext(canvas, {
        imageSmoothingEnabled: false, //keep quality!
        "background-color": contentType === contentTypes.jpg ? "#FFF" : undefined,
    })
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((degrees * Math.PI) / 180)
    ctx.translate(-(canvas.width / 2), -(canvas.height / 2))
    ctx.drawImage(img, (canvas.width - originalWidth) / 2, (canvas.height - originalHeight) / 2)
    //extract rotated image from canvas
    const imgData = ctx.getImageData((maxDimension - newWidth) / 2, (maxDimension - newHeight) / 2, newWidth, newHeight)

    //paint rotated image on new canvas with correct dimensions
    const canvas2 = createCanvas(newWidth, newHeight)
    const ctx2 = get2dContext(canvas2, {
        imageSmoothingEnabled: false, //keep quality!
        "background-color": contentType === contentTypes.jpg ? "#FFF" : undefined,
    })
    ctx2.putImageData(imgData, 0, 0)

    return canvasToImage(canvas2, contentType, 1)
}
export const flip = async (img: HTMLImageElement, type = DEFAULT_CONTENTTYPE) => flipFlop(img, true, false, type)
export const flop = async (img: HTMLImageElement, type = DEFAULT_CONTENTTYPE) => flipFlop(img, false, true, type)
export const flipFlop = async (img: HTMLImageElement, flip: boolean, flop: boolean, type = DEFAULT_CONTENTTYPE) => {
    const contentType = parseContentType(type || (await getImageContentType(img)))

    const canvas = imageToCanvas(img)
    const ctx = get2dContext(canvas, {
        "background-color": contentType === contentTypes.jpg ? "#FFF" : undefined,
    })
    ctx.translate(flip ? img.width : 0, flop ? img.height : 0)
    ctx.scale(flip ? -1 : 1, flop ? -1 : 1)
    clearCanvas(canvas)
    ctx.drawImage(img, 0, 0)
    ctx.restore()

    return canvasToImage(canvas, contentType, 1)
}
export const convertType = async (img: HTMLImageElement, targetType: string) => {
    const canvas = createCanvas(img.width, img.height)
    const ctx = get2dContext(canvas, {
        "background-color": targetType === contentTypes.jpg ? "#FFF" : undefined,
    })
    ctx.drawImage(img, 0, 0)
    return canvasToImage(canvas, targetType, 1)
}

export const getRgbColor = (canvas: HTMLCanvasElement, pos: [number, number]) => {
    const [x, y] = pos
    const ctx = get2dContext(canvas)
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    return { r, g, b }
}
export const getLightness = (img: HTMLImageElement) => {
    let colorSum = 0
    const canvas = imageToCanvas(img)
    const ctx = get2dContext(canvas)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    let r, g, b, avg

    for (let x = 0, len = data.length; x < len; x += 4) {
        r = data[x]
        g = data[x + 1]
        b = data[x + 2]

        avg = Math.floor((r + g + b) / 3)
        colorSum += avg
    }

    return Math.floor(colorSum / (img.width * img.height))
}
export const white2transparent = async (img: HTMLImageElement, tolerance: number) => {
    const width = img.width
    const height = img.height
    const canvas = imageToCanvas(img)
    const ctx = get2dContext(canvas)
    const imageData = ctx.getImageData(0, 0, width, height)
    const pixel = imageData.data

    const r = 0,
        g = 1,
        b = 2,
        a = 3
    for (let p = 0; p < pixel.length; p += 4) {
        if (pixel[p + r] >= 255 - tolerance && pixel[p + g] >= 255 - tolerance && pixel[p + b] >= 255 - tolerance) {
            // if white then change alpha to 0
            pixel[p + a] = 0
        }
    }

    ctx.putImageData(imageData, 0, 0)

    return canvasToImage(canvas, contentTypes.png, 1)
}

// utility
export default {
    contentTypes,
    getImageContentType,
    parseContentType,
    //createCanvas,
    //get2dContext,
    //clearCanvas,

    urlToImage,
    blobToImage,
    imageToBlob,
    canvasToImage,
    imageToCanvas,
    canvasToBlob,
    base64ToImage,
    imageToBase64,

    resizeByScale,
    resize,
    rotate,
    flipFlop,
    convertType,

    getLightness,
    white2transparent,
}
