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

// the offset in minutes EAST of UTC (getTimezoneOffset counts west), whole minutes in every real zone
const offsetMinutes = (date: Date): number => -date.getTimezoneOffset()

// "+05:30", "-02:30", "+00:00": hours and minutes apart, so a half-hour zone stays a valid ISO-8601 offset
const getTimezoneOffset = function (date: Date): string {
    if (!isValidDate(date)) {
        return ""
    }

    const offset = offsetMinutes(date)
    const sign = offset >= 0 ? "+" : "-"
    const hours = Math.trunc(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

/**
 * Stringifies the date as its local wall-clock time with its UTC offset (`2026-10-20T11:30:00.000+05:30`), where the
 * native `toJSON` converts to UTC — the same instant, written the way the user entered it
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
    // toISOString formats UTC: shift by the whole offset, minutes included, so it prints the local wall-clock time
    const localWallClock = new Date(inputDate.getTime() + offsetMinutes(inputDate) * 60_000)
    return `${localWallClock.toISOString().replace("Z", "")}${getTimezoneOffset(inputDate)}`
}

export default {
    isValidDate,
    timer,
    countDown,
    stringifyDate,
}
