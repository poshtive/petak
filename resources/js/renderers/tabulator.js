import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { executePetakAction } from '../core/actions.js';
import { canonicalRequest } from '../core/request.js';
import { activeElements, instances } from '../core/registry.js';
import { stateStorage } from '../core/state.js';
import { bindColumnsMenu } from '../dom/columns-menu.js';
import { structurePetakPaginator } from '../dom/paginator.js';
import { fetchTransport } from '../transports/fetch.js';
import { livewireTransport } from '../transports/livewire.js';
import { localTransport } from '../transports/local.js';

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

function tabulatorColumns(config, persistedState = null) {
    const order = persistedState?.columns?.order ?? [];
    const orderedColumns = [...config.columns].sort((left, right) => {
        const leftIndex = order.indexOf(left.key);
        const rightIndex = order.indexOf(right.key);

        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex)
            - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    });

    return orderedColumns.map((column) => {
        const alignment = {
            start: 'left',
            center: 'center',
            end: 'right',
        }[column.align] ?? column.align;
        const definition = {
            title: column.label,
            field: column.key,
            headerSort: column.sortable,
            visible: persistedState?.columns?.visibility?.[column.key] ?? column.visible,
            editor: column.editable ? 'input' : false,
            hozAlign: alignment,
            headerHozAlign: alignment,
            vertAlign: column.vertical_align ?? config.appearance?.vertical_align ?? 'middle',
            responsive: column.responsive_priority,
            ...tabulatorFilter(column),
        };

        if (column.trusted_html) {
            definition.formatter = (cell) => {
                const content = document.createElement('span');
                content.className = 'petak__cell-content';
                content.innerHTML = cell.getValue() ?? '';

                return content;
            };
        }

        return definition;
    });
}

function fitContentColumns(table, config) {
    table.blockRedraw?.();

    try {
        config.columns
            .filter((configuration) => configuration.fit_content)
            .forEach((configuration) => {
                const column = table.getColumn?.(configuration.key);

                if (column?.isVisible?.()) {
                    column.setWidth?.(true);

                    const width = column.getWidth?.();
                    const definition = column.getDefinition?.();

                    if (definition && Number.isFinite(width)) {
                        definition.width = width;
                    }
                }
            });
    } finally {
        table.restoreRedraw?.();
    }
}

export function createPetakGrid(element, options = {}) {
    if (instances.has(element)) {
        return instances.get(element);
    }

    const configElement = document.getElementById(element.dataset.petakConfig);
    const config = options.config ?? JSON.parse(configElement?.textContent ?? '{}');
    const target = element.querySelector('[data-petak-renderer]');
    const status = element.querySelector('[data-petak-status]');
    const search = element.querySelector('[data-petak-search]');
    const columnToggles = element.querySelectorAll('[data-petak-column]');
    const remote = config.mode === 'remote';
    const wireId = element.closest('[wire\\:id]')?.getAttribute('wire:id');
    const livewireComponent = wireId ? window.Livewire?.find(wireId) : null;
    const storage = stateStorage(config);
    const persistedState = storage?.load();
    const rowKey = config.row_key ?? 'id';
    const transport = options.transport ?? (
        config.transport === 'livewire'
            ? livewireTransport({
                component: livewireComponent,
                method: config.livewire_method,
            })
            : remote
                ? fetchTransport({ endpoint: config.endpoint, grid: config.name })
                : localTransport(config.initialResult?.data ?? [])
    );

    if (search && typeof persistedState?.search === 'string') {
        search.value = persistedState.search;
    }

    const tableOptions = {
        columns: tabulatorColumns(config, persistedState),
        layout: 'fitColumns',
        placeholder: 'No entries found.',
        pagination: true,
        paginationMode: remote ? 'remote' : 'local',
        paginationSize: config.pagination.default_page_size,
        paginationSizeSelector: config.pagination.page_sizes,
        paginationCounter: (pageSize, currentRow, _currentPage, totalRows) => {
            const from = totalRows > 0 ? currentRow : 0;
            const to = totalRows > 0 ? Math.min(currentRow + pageSize - 1, totalRows) : 0;
            const noun = totalRows === 1 ? 'entry' : 'entries';

            return `Showing ${from} to ${to} of ${totalRows} ${noun}`;
        },
        paginationButtonCount: window.matchMedia?.('(max-width: 480px)').matches ? 3 : 5,
        langs: {
            default: {
                pagination: {
                    first: '«',
                    first_title: 'First page',
                    last: '»',
                    last_title: 'Last page',
                    prev: '‹',
                    prev_title: 'Previous page',
                    next: '›',
                    next_title: 'Next page',
                },
            },
        },
        sortMode: remote ? 'remote' : 'local',
        filterMode: remote ? 'remote' : 'local',
        movableColumns: Boolean(config.state),
        selectableRows: config.bulk_actions?.length ? true : false,
        ajaxLoaderLoading: `
            <div class="petak__loader" role="status">
                <span class="petak__loader-spinner" aria-hidden="true"></span>
                <span>Loading data…</span>
            </div>
        `,
        ajaxLoaderError: `
            <div class="petak__loader petak__loader--error" role="alert">
                Unable to load data.
            </div>
        `,
        ajaxURL: remote ? config.endpoint : undefined,
        ajaxRequestFunc: remote
            ? async (_url, _requestConfig, params) => {
                status.textContent = '';
                element.classList.remove('petak-has-error');

                try {
                    lastRequest = canonicalRequest(config, params, search?.value ?? '');
                    const result = await transport.load(lastRequest);
                    const pagination = result.meta?.pagination ?? {};

                    return {
                        data: result.data,
                        last_page: pagination.last_page ?? 1,
                        last_row: pagination.total ?? result.data.length,
                    };
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        status.textContent = error.message;
                        element.classList.add('petak-has-error');
                    }
                    throw error;
                } finally {
                    if (!element.classList.contains('petak-has-error')) status.textContent = '';
                }
            }
            : undefined,
    };
    let lastRequest = canonicalRequest(config, {}, search?.value ?? '');

    if (persistedState?.pageSize) {
        tableOptions.paginationSize = persistedState.pageSize;
    }

    if (Array.isArray(persistedState?.sort) && persistedState.sort.length > 0) {
        tableOptions.initialSort = persistedState.sort;
    }

    if (Array.isArray(persistedState?.filters) && persistedState.filters.length > 0) {
        tableOptions.initialFilter = persistedState.filters;
    }

    if (!remote) {
        tableOptions.data = config.initialResult?.data ?? [];
    }

    const table = new Tabulator(target, tableOptions);
    const unbindColumnsMenu = bindColumnsMenu(element);
    const searchableFields = config.columns
        .filter((column) => column.searchable)
        .map((column) => column.key);
    const applyLocalSearch = () => {
        table.setFilter((row) => {
            const needle = search?.value.toLocaleLowerCase() ?? '';

            return searchableFields.some((field) => String(row[field] ?? '').toLocaleLowerCase().includes(needle));
        });
    };
    let tableReady = false;
    let fitContentPending = true;
    let fittingContent = false;
    const fitColumns = () => {
        if (!tableReady || fittingContent) {
            return;
        }

        fittingContent = true;

        try {
            fitContentColumns(table, config);
        } finally {
            fittingContent = false;
        }
    };

    structurePetakPaginator(target);
    table.on?.('tableBuilt', () => {
        tableReady = true;

        if (fitContentPending) {
            fitContentPending = false;
            fitColumns();
        }

        if (!remote && search?.value) {
            applyLocalSearch();
        }
    });
    table.on?.('dataProcessed', () => {
        fitContentPending = true;
    });
    table.on?.('renderComplete', () => {
        structurePetakPaginator(target);

        if (tableReady && fitContentPending) {
            fitContentPending = false;
            fitColumns();
        }
    });

    const persistState = () => {
        if (!storage || !tableReady) {
            return;
        }

        storage.save({
            pageSize: table.getPageSize?.() ?? config.pagination.default_page_size,
            sort: table.getSorters?.() ?? [],
            filters: table.getFilters?.() ?? [],
            columns: {
                order: table.getColumns?.().map((column) => column.getField()) ?? [],
                visibility: Object.fromEntries(
                    table.getColumns?.().map((column) => [column.getField(), column.isVisible()]) ?? [],
                ),
            },
            search: search?.value ?? '',
        });
    };

    table.on?.('columnMoved', persistState);
    table.on?.('columnVisibilityChanged', (column) => {
        persistState();

        const configuration = config.columns.find(
            (candidate) => candidate.key === column?.getField?.(),
        );

        if (column?.isVisible?.() && configuration?.fit_content) {
            fitColumns();
        }
    });
    table.on?.('pageSizeChanged', persistState);
    table.on?.('dataSorted', persistState);
    table.on?.('dataFiltered', persistState);
    table.on?.('cellEdited', async (cell) => {
        try {
            await executePetakAction(config, {
                type: 'edit',
                key: cell.getRow().getData()[rowKey],
                field: cell.getField(),
                value: cell.getValue(),
            });
        } catch (error) {
            cell.restoreOldValue?.();
            status.textContent = error.message;
            element.classList.add('petak-has-error');
        }
    });

    const instance = {
        table,
        reload: () => remote ? table.setData() : Promise.resolve(),
        destroy() {
            unbindColumnsMenu();
            transport?.destroy?.();
            table.destroy();
            instances.delete(element);
            activeElements.delete(element);
        },
    };

    columnToggles.forEach((toggle) => {
        if (persistedState?.columns?.visibility?.[toggle.value] !== undefined) {
            toggle.checked = persistedState.columns.visibility[toggle.value];
        }
        toggle.addEventListener('change', () => {
            table.getColumn?.(toggle.value)?.toggle();
            persistState();
        });
    });

    element.querySelectorAll('[data-petak-bulk]').forEach((button) => {
        button.addEventListener('click', async () => {
            await executePetakAction(config, {
                type: 'bulk',
                name: button.dataset.petakBulk,
                mode: 'selected',
                keys: table.getSelectedData?.().map((row) => row[rowKey]) ?? [],
                request: lastRequest,
            });
            await instance.reload();
        });
    });

    element.querySelectorAll('[data-petak-export]').forEach((button) => {
        button.addEventListener('click', async () => {
            const exportConfig = config.exports?.find((candidate) => candidate.name === button.dataset.petakExport);
            const blob = await executePetakAction(config, {
                type: 'export',
                name: button.dataset.petakExport,
                request: lastRequest,
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${config.name}.${exportConfig?.extension ?? button.dataset.petakExport}`;
            link.click();
            URL.revokeObjectURL(link.href);
        });
    });

    if (search) {
        let timeout;
        search.addEventListener('input', () => {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                persistState();
                if (remote) {
                    table.setData();
                } else {
                    applyLocalSearch();
                }
            }, 300);
        });
    }

    instances.set(element, instance);
    activeElements.add(element);

    return instance;
}
