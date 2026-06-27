export function serializableSorters(sorters = []) {
    return sorters
        .filter((sorter) => sorter?.field && sorter?.dir)
        .map((sorter) => ({
            field: sorter.field,
            dir: sorter.dir,
        }));
}

export function serializableFilters(filters = []) {
    return filters
        .filter((filter) => filter?.field && filter.value !== '' && filter.value !== null)
        .map((filter) => ({
            field: filter.field,
            type: typeof filter.type === 'function' ? 'function' : filter.type,
            value: filter.value,
        }));
}
