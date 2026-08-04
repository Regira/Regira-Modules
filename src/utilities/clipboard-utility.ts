function fallbackCopyTextToClipboard(text: string): Promise<void> {
    // last resort for non-secure contexts where navigator.clipboard is unavailable
    const textArea = document.createElement("textarea")
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = "0"
    textArea.style.left = "0"
    textArea.style.position = "fixed"

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
        document.execCommand("copy")
    } finally {
        textArea.remove()
    }

    return Promise.resolve()
}

export function copyTextToClipboard(text: string): Promise<void> {
    return navigator.clipboard?.writeText(text) ?? fallbackCopyTextToClipboard(text)
}

export default copyTextToClipboard
