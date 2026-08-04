export const redirect = (url: string, delayInSeconds = 0): void => {
    const tag = document.createElement("meta")
    tag.setAttribute("http-equiv", "Refresh")
    tag.setAttribute("content", `${delayInSeconds}; url=${url}`)
    document.head.appendChild(tag)
}

export interface Offset {
    top: number
    left: number
}

export const getAbsOffset = (element: HTMLElement): Offset => {
    let top = 0,
        left = 0
    let el: HTMLElement | null = element
    while (el) {
        top += el.offsetTop || 0
        left += el.offsetLeft || 0
        el = el.offsetParent as HTMLElement | null
    }
    return {
        top: top,
        left: left,
    }
}

export const getAbsScrollPosition = (element: HTMLElement): Offset => {
    let top = 0,
        left = 0
    let el: HTMLElement | null = element
    while (el) {
        top += el.scrollTop || 0
        left += el.scrollLeft || 0
        el = el.parentElement
    }
    return {
        top: top,
        left: left,
    }
}

export const setMetaTag = (name: string, content: string): void => {
    let metaTag = document.getElementsByName(name)[0] as HTMLMetaElement | undefined
    if (metaTag == null) {
        const headerNodes = Array.from(document.head.childNodes).filter((n) => (n as HTMLElement).tagName === "META")
        const lastMetaTagInHead = headerNodes.slice(-1)[0] as HTMLElement | undefined
        metaTag = document.createElement("meta")
        if (lastMetaTagInHead != null) {
            lastMetaTagInHead.insertAdjacentElement("afterend", metaTag)
        } else {
            document.head.appendChild(metaTag)
        }
    }
    metaTag.setAttribute("name", name)
    metaTag.setAttribute("content", content)
}

export const setCanonicalTag = (url: string): void => {
    let metaTag = document.querySelector("[rel=canonical]") as HTMLLinkElement | null
    if (metaTag == null) {
        const headerNodes = Array.from(document.head.childNodes).filter((n) => (n as HTMLElement).tagName === "META")
        const lastMetaTagInHead = headerNodes.slice(-1)[0] as HTMLElement | undefined
        metaTag = document.createElement("link")
        if (lastMetaTagInHead != null) {
            lastMetaTagInHead.insertAdjacentElement("afterend", metaTag)
        } else {
            document.head.appendChild(metaTag)
        }
    }
    metaTag.setAttribute("rel", "canonical")
    metaTag.setAttribute("href", url)
}

export default {
    redirect,
    setMetaTag,
    setCanonicalTag,
}
