export function searchableFields(config) {
    return config.columns
        .filter((column) => column.searchable)
        .map((column) => column.key);
}

export function createLocalSearch(table, fields, search) {
    return () => {
        table.setFilter((row) => {
            const needle = search?.value.toLocaleLowerCase() ?? '';

            return fields.some((field) => String(row[field] ?? '').toLocaleLowerCase().includes(needle));
        });
    };
}
