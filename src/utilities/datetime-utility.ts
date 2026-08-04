export const isValidDate = (date: unknown): boolean => {
    const dateObj = date instanceof Date ? date : new Date(date as string | number)
    return !isNaN(+dateObj)
}

export const daysDiff = (date1: Date | number | string, date2: Date | number | string): number =>
    Math.ceil(Math.abs(new Date(date2).getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24))

export const timer = {
    last: new Date().getTime(),
    log(dateToCompare?: Date | number | string): number {
        const newTime = new Date().getTime()
        const sourceTime = dateToCompare ? new Date(dateToCompare).getTime() : this.last
        this.last = newTime
        return newTime - sourceTime
    },
}

export interface CountdownValues {
    days: number
    hours: number
    minutes: number
    seconds: number
}

export const countDown = (startDate: Date | number | string, interval = 1000): CountdownValues => {
    // https://stackoverflow.com/questions/13903897/javascript-return-number-of-days-hours-minutes-seconds-between-two-dates#answer-13904120
    const countDownValues: CountdownValues = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    }
    const update = () => {
        const now = new Date()
        let delta = Math.abs(new Date(startDate).getTime() - now.getTime()) / 1000

        countDownValues.days = Math.floor(delta / 86400)
        delta -= countDownValues.days * 86400

        countDownValues.hours = Math.floor(delta / 3600) % 24
        delta -= countDownValues.hours * 3600

        countDownValues.minutes = Math.floor(delta / 60) % 60
        delta -= countDownValues.minutes * 60

        countDownValues.seconds = Math.floor(delta)
    }

    setInterval(update, interval)
    update()

    return countDownValues
}

const getTimezoneOffset = function (date: Date): string {
    if (!isValidDate(date)) {
        return ""
    }

    const offset = -date.getTimezoneOffset()
    const timezoneOffsetInHours = offset / 60
    const timezoneOffsetMinutes = offset % 60
    const sign = timezoneOffsetInHours >= 0 ? "+" : "-"
    return `${sign}${Math.abs(timezoneOffsetInHours).toString().padStart(2, "0")}:${Math.abs(timezoneOffsetMinutes).toString().padStart(2, "0")}`
}

/**
 * Stringifies the date without timezone 'correction' in JSON format
 * @param {Date|number} date
 *  the date as Date or time in milliseconds
 * @returns the serialized date
 */
export const stringifyDate = function (date: Date | number): string | undefined {
    if (!isValidDate(date)) {
        return undefined
    }

    //https://stackoverflow.com/questions/31096130/how-to-json-stringify-a-javascript-date-and-preserve-timezone#36643588
    const inputDate = date instanceof Date ? date : new Date(date)
    const correctedDate = new Date(date instanceof Date ? date.getTime() : date)
    const timezoneOffset = getTimezoneOffset(inputDate)
    correctedDate.setHours(inputDate.getHours() + parseInt(timezoneOffset.split(":")[0]!))
    const iso = correctedDate.toISOString().replace("Z", "")
    return `${iso}${timezoneOffset}`
}

export default {
    isValidDate,
    timer,
    countDown,
    stringifyDate,
}
