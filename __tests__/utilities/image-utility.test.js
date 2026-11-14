import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import imageUtility from "../../src/utilities/image-utility"

// jsdom loads no image and has no canvas: an Image that loads (or fails) on its own, and a 2d context that records
// what is drawn, stand in for the browser. The pixels themselves are checked in a browser.
class FakeImage {
    static fail = false
    width = 0
    height = 0
    naturalWidth = 0
    naturalHeight = 0
    #src = ""
    get src() {
        return this.#src
    }
    set src(value) {
        this.#src = value
        queueMicrotask(() => (FakeImage.fail ? this.onerror?.(new Event("error")) : this.onload?.()))
    }
}

let draws
function fakeContext(canvas) {
    const ctx = {
        canvas,
        fillRect: vi.fn(),
        drawImage: vi.fn((source, ...args) =>
            draws.push({ source, to: canvas, size: [canvas.width, canvas.height], args, quality: ctx.imageSmoothingQuality, fill: ctx.fillStyle })
        ),
    }
    return ctx
}

beforeEach(() => {
    draws = []
    FakeImage.fail = false
    vi.stubGlobal("Image", FakeImage)
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("fetched", { headers: { "content-type": "image/png" } }))
    )
    const contexts = new WeakMap()
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
        if (!contexts.has(this)) contexts.set(this, fakeContext(this))
        return contexts.get(this)
    })
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (resolve, type) {
        resolve(new Blob(["drawn"], { type }))
    })
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation((type) => `data:${type};base64,AAAA`)
})
afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

const imageWithSrc = (src, width = 4, height = 3) =>
    Object.assign(new FakeImage(), { width, height, naturalWidth: width, naturalHeight: height }, { src })

describe("imageToBlob", () => {
    test("decodes a base64 data URL without a request", async () => {
        const img = imageWithSrc(`data:image/png;base64,${btoa("png-bytes")}`)

        const blob = await imageUtility.imageToBlob(img, "photo.png")

        expect(fetch).not.toHaveBeenCalled()
        expect(blob.type).toBe("image/png")
        expect(blob.name).toBe("photo.png")
        expect(await blob.text()).toBe("png-bytes")
    })

    test("decodes a URL-encoded data URL without a request", async () => {
        const img = imageWithSrc(`data:image/svg+xml,${encodeURIComponent("<svg/>")}`)

        const blob = await imageUtility.imageToBlob(img)

        expect(fetch).not.toHaveBeenCalled()
        expect(blob.type).toBe("image/svg+xml")
        expect(await blob.text()).toBe("<svg/>")
    })

    test("draws a blob: source to a canvas without a request, as PNG unless a type is asked", async () => {
        const img = imageWithSrc("blob:http://localhost/1234", 40, 30)

        const png = await imageUtility.imageToBlob(img, "photo.png")
        const jpeg = await imageUtility.imageToBlob(img, undefined, "image/jpg")

        expect(fetch).not.toHaveBeenCalled()
        expect(png.type).toBe("image/png")
        expect(png.name).toBe("photo.png")
        expect(jpeg.type).toBe("image/jpeg")
        expect(draws.map((d) => d.size)).toEqual([
            [40, 30],
            [40, 30],
        ])
        expect(draws.every((d) => d.source === img)).toBe(true)
    })

    test("fetches any other URL", async () => {
        const img = imageWithSrc("https://example.test/photo.png")

        const blob = await imageUtility.imageToBlob(img)

        expect(fetch).toHaveBeenCalledWith("https://example.test/photo.png")
        expect(await blob.text()).toBe("fetched")
    })
})

describe("blobToImage", () => {
    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => "blob:http://localhost/abcd")
        URL.revokeObjectURL = vi.fn()
    })
    afterEach(() => {
        delete URL.createObjectURL
        delete URL.revokeObjectURL
    })

    test("releases its object URL once the image has loaded", async () => {
        const img = await imageUtility.blobToImage(new Blob(["x"], { type: "image/png" }))

        expect(img.src).toBe("blob:http://localhost/abcd")
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/abcd")
    })

    test("releases its object URL when the image fails to load", async () => {
        FakeImage.fail = true

        await expect(imageUtility.blobToImage(new Blob(["x"]))).rejects.toBeTruthy()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/abcd")
    })

    test("its image converts back to the Blob it was made from, bytes and type kept", async () => {
        const img = await imageUtility.blobToImage(new Blob(["jpeg-bytes"], { type: "image/jpeg" }))

        const blob = await imageUtility.imageToBlob(img, "photo.jpg")

        expect(fetch).not.toHaveBeenCalled()
        expect(await blob.text()).toBe("jpeg-bytes")
        expect(blob.type).toBe("image/jpeg")
        expect(blob.name).toBe("photo.jpg")
    })

    test("its image is drawn and re-encoded only when another type is asked", async () => {
        const img = await imageUtility.blobToImage(new Blob(["jpeg-bytes"], { type: "image/jpeg" }))

        const same = await imageUtility.imageToBlob(img, undefined, "image/jpg")
        const other = await imageUtility.imageToBlob(img, undefined, "image/png")

        expect(await same.text()).toBe("jpeg-bytes")
        expect(await other.text()).toBe("drawn")
        expect(other.type).toBe("image/png")
    })
})

describe("resizeByScale", () => {
    test("halves step by step from a first canvas within 4096 px", async () => {
        const img = imageWithSrc("data:image/jpeg;base64,AAAA", 10000, 7500)

        await imageUtility.resizeByScale(img, 0.08, { type: "image/png" })

        expect(draws.map((d) => d.size)).toEqual([
            [3200, 2400],
            [1600, 1200],
            [800, 600],
        ])
        expect(draws[0].source).toBe(img)
        expect(draws[1].source).toBe(draws[0].to)
        expect(draws.every((d) => d.quality === "high")).toBe(true)
    })

    test("only a JPEG's last canvas gets a white background", async () => {
        const img = imageWithSrc("data:image/jpeg;base64,AAAA", 400, 400)

        await imageUtility.resizeByScale(img, 0.25, { type: "image/png" })
        const png = draws.splice(0)
        await imageUtility.resizeByScale(img, 0.25, { type: "image/jpeg" })

        expect(png.every((d) => d.fill == null)).toBe(true)
        expect(draws.map((d) => [d.size, d.fill])).toEqual([
            [[200, 200], undefined],
            [[100, 100], "rgba(255, 255, 255, 1)"],
        ])
    })
})

describe("resize", () => {
    test("draws the source image, then scales that to the target", async () => {
        const img = imageWithSrc("data:image/png;base64,AAAA", 400, 200)

        await imageUtility.resize(img, [100, 50], { type: "image/png" })

        expect(draws[0].source).toBe(img)
        expect(draws[1].source).toBe(draws[0].to)
    })
})
