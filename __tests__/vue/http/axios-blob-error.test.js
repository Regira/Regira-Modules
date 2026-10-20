import { describe, test, expect } from "vitest"
import { AxiosError } from "axios"
import { initAxios } from "../../../src/vue/http/axios"

// A download (`responseType: "blob"`) receives its error body as a Blob too, so the response interceptor reads a
// JSON-typed one back into an object. The read runs in a FileReader callback: a body that does not parse there
// must still reject the request, or `getFile` never settles and the spinner stays on.
function failWith(body, type) {
    const myAxios = initAxios({ api: "http://localhost" })
    myAxios.defaults.adapter = async (config) => {
        const data = new Blob([body], { type })
        throw new AxiosError("Request failed with status code 400", AxiosError.ERR_BAD_REQUEST, config, config, {
            status: 400,
            statusText: "Bad Request",
            headers: { "content-type": type },
            config,
            data,
        })
    }
    return myAxios.get("/files/1", { responseType: "blob" })
}

describe("initAxios — blob error bodies", () => {
    test("parses a JSON error body into response.data", async () => {
        const error = await failWith('{"title":"Not allowed"}', "application/problem+json").catch((e) => e)

        expect(error).toBeInstanceOf(AxiosError)
        expect(error.response.data).toEqual({ title: "Not allowed" })
    })

    test("still rejects when a JSON-typed error body is empty, keeping the blob", async () => {
        const error = await failWith("", "application/problem+json").catch((e) => e)

        expect(error).toBeInstanceOf(AxiosError)
        expect(error.response.data).toBeInstanceOf(Blob)
    })
})
