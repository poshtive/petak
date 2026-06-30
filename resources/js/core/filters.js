/**
 * Filter value helpers shared by the request builder and the local data engine.
 */

export function operatorNeedsValue(operator) {
    return !['is_empty', 'is_not_empty'].includes(operator);
}

export function hasFilterValue(filter) {
    if (!operatorNeedsValue(filter.operator)) {
        return true;
    }

    if (['between', 'not_between'].includes(filter.operator)) {
        return filter.value?.from !== '' && filter.value?.from !== undefined && filter.value?.from !== null
            && filter.value?.to !== '' && filter.value?.to !== undefined && filter.value?.to !== null;
    }

    return filter.value !== '' && filter.value !== null && filter.value !== undefined;
}
