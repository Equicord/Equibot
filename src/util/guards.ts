export function isTruthy<T>(item: T): item is Exclude<T, 0 | "" | false | null | undefined> {
    return Boolean(item);
}

export function isNonNullish<T>(item: T): item is Exclude<T, null | undefined> {
    return item != null;
}
