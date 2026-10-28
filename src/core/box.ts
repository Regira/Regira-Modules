/**
 * Where a controller keeps a piece of its state. A controller only ever assigns `value`, never edits what it holds
 * in place, so a box only has to notice assignments: a framework layer passes its own factory (Vue passes `ref`).
 */
export type Box<T> = { value: T }
export type BoxFactory = <T>(initial: T) => Box<T>

/** a box that is a plain object, for a controller used without a framework */
export const plainBox: BoxFactory = <T>(initial: T): Box<T> => ({ value: initial })
