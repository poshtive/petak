export function canonicalRequest(config, params = {}, search = '') {
    return {
        version: config.version,
        grid: config.name,
        page: {
            mode: 'page',
            number: params.page ?? 1,
            size: params.size ?? config.pagination.default_page_size,
        },
        sort: (params.sorters ?? params.sort ?? []).map((sort) => ({
            field: sort.field,
            direction: sort.dir,
        })),
        filters: (params.filters ?? params.filter ?? [])
            .filter((filter) => filter.value !== '' && filter.value !== null)
            .map((filter) => {
                const column = config.columns.find((candidate) => candidate.key === filter.field);

                return {
                    field: filter.field,
                    operator: column?.filter?.operator ?? 'contains',
                    value: filter.value,
                };
            }),
        search: {
            value: search,
        },
    };
}
