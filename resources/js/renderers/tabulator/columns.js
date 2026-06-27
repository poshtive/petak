function tabulatorFilter(column) {
    if (!column.filter) {
        return {};
    }

    const filter = column.filter;

    if (filter.component === 'select') {
        return {
            headerFilter: 'list',
            headerFilterParams: {
                values: {
                    '': '',
                    ...filter.options,
                },
                clearable: true,
            },
            headerFilterLiveFilter: false,
        };
    }

    return {
        headerFilter: 'input',
        headerFilterFunc: filter.input_type === 'number' ? '=' : undefined,
        headerFilterLiveFilter: filter.type === 'text',
        headerFilterParams: filter.input_type && filter.input_type !== 'text'
            ? { elementAttributes: { type: filter.input_type } }
            : undefined,
    };
}

function alignment(column) {
    return {
        start: 'left',
        center: 'center',
        end: 'right',
    }[column.align] ?? column.align;
}

function applyPersistedOrder(columns, persistedState = null) {
    const order = persistedState?.columns?.order ?? [];

    return [...columns].sort((left, right) => {
        const leftIndex = order.indexOf(left.key);
        const rightIndex = order.indexOf(right.key);

        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex)
            - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    });
}

function groupPinnedColumns(columns) {
    const left = columns.filter((column) => column.pin === 'left');
    const right = columns.filter((column) => column.pin === 'right');
    const center = columns.filter((column) => !column.pin);

    if (center.length === 0 && columns.length > 0) {
        const fallback = right.pop() ?? left.pop();

        if (fallback) {
            center.push({ ...fallback, pin: null });
        }
    }

    return [...left, ...center, ...right];
}

function columnMinWidth(column, config) {
    if (column.sizing?.min_width !== null && column.sizing?.min_width !== undefined) {
        return column.sizing.min_width;
    }

    if (column.responsive_priority > 0) {
        return 100;
    }

    if (column.sizing?.mode === 'compact') {
        return 56;
    }

    return config.responsive?.layout ? 120 : undefined;
}

function widthPolicy(column) {
    const sizing = column.sizing ?? {};
    const policy = {};

    if (sizing.width !== null && sizing.width !== undefined) {
        policy.width = sizing.width;
    }

    if (sizing.max_width !== null && sizing.max_width !== undefined) {
        policy.maxWidth = sizing.max_width;
    }

    if (sizing.mode === 'compact') {
        policy.width = policy.width ?? '1%';
        policy.widthGrow = 0;
        policy.widthShrink = 0;
    }

    return policy;
}

function responsivePriority(column, config) {
    if (!config.responsive?.layout) {
        return undefined;
    }

    return column.responsive_priority > 0 ? column.responsive_priority : undefined;
}

function htmlFormatter(cell) {
    const content = document.createElement('span');
    content.className = 'petak__cell-content';
    content.innerHTML = cell.getValue() ?? '';

    return content;
}

function definedOptions(options) {
    return Object.fromEntries(
        Object.entries(options).filter(([_key, value]) => value !== undefined),
    );
}

export function tabulatorColumns(config, persistedState = null) {
    return groupPinnedColumns(applyPersistedOrder(config.columns, persistedState)).map((column) => {
        const horizontalAlignment = alignment(column);

        return definedOptions({
            title: column.label,
            field: column.key,
            headerSort: Boolean(column.sortable),
            visible: persistedState?.columns?.visibility?.[column.key] ?? column.visible,
            editor: column.editable ? 'input' : false,
            hozAlign: horizontalAlignment,
            headerHozAlign: horizontalAlignment,
            vertAlign: column.vertical_align ?? config.appearance?.vertical_align ?? 'middle',
            responsive: responsivePriority(column, config),
            minWidth: columnMinWidth(column, config),
            frozen: Boolean(column.pin),
            formatter: column.trusted_html ? htmlFormatter : undefined,
            ...widthPolicy(column),
            ...tabulatorFilter(column),
        });
    });
}
