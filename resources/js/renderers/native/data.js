function compareValues(left, right) {
    if (left === right) {
        return 0;
    }

    if (left === null || left === undefined) {
        return -1;
    }

    if (right === null || right === undefined) {
        return 1;
    }

    return `${left}`.localeCompare(`${right}`, undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

function matchesFilter(actual, operator, expected) {
    const actualString = `${actual ?? ''}`.toLowerCase();
    const expectedString = `${expected ?? ''}`.toLowerCase();

    return {
        contains: () => actualString.includes(expectedString),
        not_contains: () => !actualString.includes(expectedString),
        starts_with: () => actualString.startsWith(expectedString),
        ends_with: () => actualString.endsWith(expectedString),
        equals: () => actual == expected || actualString === expectedString,
        not_equals: () => actual != expected && actualString !== expectedString,
        greater_than: () => actual > expected,
        greater_or_equal: () => actual >= expected,
        less_than: () => actual < expected,
        less_or_equal: () => actual <= expected,
        between: () => actual >= expected.from && actual <= expected.to,
        not_between: () => actual < expected.from || actual > expected.to,
        in: () => [expected].flat().includes(actual),
        not_in: () => ![expected].flat().includes(actual),
        is_empty: () => actual === null || actual === undefined || actual === '',
        is_not_empty: () => actual !== null && actual !== undefined && actual !== '',
    }[operator]?.() ?? actualString.includes(expectedString);
}

function operatorNeedsValue(operator) {
    return !['is_empty', 'is_not_empty'].includes(operator);
}

function hasFilterValue(filter) {
    if (!operatorNeedsValue(filter.operator)) {
        return true;
    }

    if (['between', 'not_between'].includes(filter.operator)) {
        return filter.value?.from !== '' && filter.value?.from !== undefined && filter.value?.from !== null
            && filter.value?.to !== '' && filter.value?.to !== undefined && filter.value?.to !== null;
    }

    return filter.value !== '' && filter.value !== null && filter.value !== undefined;
}

export function localResult(config, state) {
    const rows = [...(config.initialResult?.data ?? [])];
    const searchable = (config.columns ?? []).filter((column) => column.searchable).map((column) => column.key);
    const filtered = rows
        .filter((row) => {
            if (!state.search || searchable.length === 0) {
                return true;
            }

            const search = state.search.toLowerCase();

            return searchable.some((field) => `${row[field] ?? ''}`.toLowerCase().includes(search));
        })
        .filter((row) => Object.entries(state.filters).every(([field, filter]) => {
            if (!hasFilterValue(filter)) {
                return true;
            }

            return matchesFilter(row[field], filter.operator, filter.value);
        }));

    state.sort.slice().reverse().forEach((sort) => {
        const direction = sort.dir ?? sort.direction;
        filtered.sort((left, right) => {
            const result = compareValues(left[sort.field], right[sort.field]);

            return direction === 'desc' ? result * -1 : result;
        });
    });

    const total = filtered.length;
    const page = Math.max(1, state.page.number);
    const perPage = Math.max(1, state.page.size);
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, lastPage);
    const start = (safePage - 1) * perPage;
    const data = filtered.slice(start, start + perPage);

    return {
        version: '1',
        data,
        meta: {
            pagination: {
                mode: 'local',
                page: safePage,
                per_page: perPage,
                total,
                last_page: lastPage,
                from: total > 0 ? start + 1 : null,
                to: total > 0 ? start + data.length : null,
            },
            aggregates: [],
        },
        errors: [],
    };
}
