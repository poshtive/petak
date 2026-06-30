import { hasFilterValue } from '../../core/filters.js';

export function nativeRequest(config, state) {
    return {
        version: config.version,
        grid: config.name,
        page: {
            mode: 'page',
            number: state.page.number,
            size: state.page.size,
        },
        sort: state.sort.map((sort) => ({
            field: sort.field,
            direction: sort.dir ?? sort.direction,
        })),
        filters: Object.entries(state.filters)
            .filter(([, filter]) => hasFilterValue(filter))
            .map(([field, filter]) => ({
                field,
                operator: filter.operator,
                value: filter.value,
            })),
        search: {
            value: state.search,
        },
    };
}

export function resultMeta(result) {
    return result?.meta?.pagination ?? {
        page: 1,
        per_page: result?.data?.length ?? 0,
        total: result?.data?.length ?? 0,
        from: result?.data?.length ? 1 : 0,
        to: result?.data?.length ?? 0,
        last_page: 1,
    };
}
