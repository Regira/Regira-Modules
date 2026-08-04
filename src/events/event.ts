class Event {
    type: string
    src?: Event;
    [key: string]: unknown

    constructor(type: string, src?: Event, data?: Record<string, unknown>) {
        this.type = type
        this.src = src
        if (data != null) {
            Object.keys(data).forEach((key) => {
                if (!(key in this)) {
                    this[key] = data[key]
                }
            })
        }
    }
}

export default Event
