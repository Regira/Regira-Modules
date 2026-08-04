import FileHelper from "./file-helper"
import imageUtility from "../utilities/image-utility"

type ImageInput = HTMLImageElement | string | Blob | HTMLCanvasElement

class ImageHelper extends FileHelper {
    async getImage(input: ImageInput): Promise<HTMLImageElement> {
        if (input instanceof HTMLImageElement) {
            return input
        }
        if (typeof input === "string") {
            return imageUtility.urlToImage(input)
        }
        if (input instanceof Blob) {
            return imageUtility.blobToImage(input)
        }
        if (input instanceof HTMLCanvasElement) {
            return imageUtility.canvasToImage(input)
        }
        throw Error("Cannot convert input to type Image")
    }
    async getBlob(input: HTMLImageElement | HTMLCanvasElement | File | Blob | string, filename?: string, type?: string): Promise<Blob> {
        if (input instanceof HTMLImageElement) {
            return imageUtility.imageToBlob(input, filename, type) as Promise<Blob>
        } else if (input instanceof HTMLCanvasElement) {
            return imageUtility.canvasToBlob(input, type) as Promise<Blob>
        }

        return super.getBlob(input, filename, type)
    }

    async resize(input: ImageInput, max: number, options?: { quality?: number; type?: string }) {
        const img = await this.getImage(input)
        return imageUtility.resizeByScale(img, Math.min(1, max / Math.max(img.width, img.height)), options)
        //return imageUtility.resize(img, max, options);
    }
    async rotate(input: Blob, direction: number) {
        const type = imageUtility.parseContentType(input.type)
        const img = await this.getImage(input)
        return imageUtility.rotate(img, direction, type)
    }
    async flipHorizontally(input: ImageInput) {
        return this.flipFlop(input, true)
    }
    async flipVertically(input: ImageInput) {
        return this.flipFlop(input, false, true)
    }
    async flipFlop(input: ImageInput, flip = false, flop = false, type?: string) {
        const img = await this.getImage(input)
        return imageUtility.flipFlop(img, flip, flop, type)
    }
    async convertType(input: ImageInput, targetType: string) {
        const img = await this.getImage(input)
        return imageUtility.convertType(img, targetType)
    }

    async getLightness(input: ImageInput) {
        const img = await this.getImage(input)
        return imageUtility.getLightness(img)
    }
    async white2transparent(input: ImageInput, tolerance = 0) {
        const img = await this.getImage(input)
        return imageUtility.white2transparent(img, tolerance)
    }
}

export default ImageHelper
