import { stateStorage } from '../../core/state.js';

function defaultPageSize(config) {
    return config.pagination?.default_page_size ?? 25;
}

export function createNativeState(config) {
    const storage = stateStorage(config);
    const persisted = storage?.load() ?? {};
    const columnVisibility = {
        ...Object.fromEntries((config.columns ?? []).map((column) => [column.key, column.visible])),
        ...(persisted.columns?.visibility ?? {}),
    };
    ensureVisibleColumn(config, columnVisibility);
    const defaultFilters = Object.fromEntries(
        (config.columns ?? [])
            .filter((column) => column.filter)
            .map((column) => [
                column.key,
                {
                    operator: column.filter.operator,
                    value: '',
                },
            ]),
    );
    let state = {
        page: {
            number: 1,
            size: persisted.pageSize ?? defaultPageSize(config),
        },
        sort: Array.isArray(persisted.sort) ? persisted.sort : [],
        filters: {
            ...defaultFilters,
            ...(persisted.filters ?? {}),
        },
        columns: {
            visibility: columnVisibility,
        },
        search: persisted.search ?? '',
        expanded: new Set(),
        collapsedToggled: new Set(),
        selected: new Set(),
    };
    let saveTimer;

    function persist() {
        if (!storage) {
            return;
        }

        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
            storage.save({
                pageSize: state.page.size,
                sort: state.sort,
                filters: state.filters,
                columns: state.columns,
                search: state.search,
            });
        }, 100);
    }

    return {
        get() {
            return state;
        },

        update(mutator, { persist: shouldPersist = true } = {}) {
            state = mutator(structuredCloneState(state));

            if (shouldPersist) {
                persist();
            }

            return state;
        },

        destroy() {
            globalThis.window?.clearTimeout?.(saveTimer);
        },
    };
}

function ensureVisibleColumn(config, visibility) {
    const columns = config.columns ?? [];

    if (columns.length === 0 || columns.some((column) => visibility[column.key] !== false)) {
        return;
    }

    visibility[columns[0].key] = true;
}

function structuredCloneState(state) {
    return {
        ...state,
        page: { ...state.page },
        sort: [...state.sort],
        filters: Object.fromEntries(
            Object.entries(state.filters).map(([key, filter]) => [key, { ...filter }]),
        ),
        columns: {
            visibility: { ...state.columns.visibility },
        },
        expanded: new Set(state.expanded),
        collapsedToggled: new Set(state.collapsedToggled),
        selected: new Set(state.selected),
    };
}
