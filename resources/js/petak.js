import { TabulatorFull as Tabulator } from 'tabulator-tables';

const instances = new WeakMap();
const activeElements = new Set();
let lifecycleInitialized = false;

export function structurePetakPaginator(root) {
    const paginator = root.querySelector('.tabulator-paginator');

    if (!paginator) {
        return;
    }

    const label = paginator.querySelector('label');
    const pageSize = paginator.querySelector('.tabulator-page-size');
    const navigationItems = [
        paginator.querySelector('.tabulator-page[data-page="first"]'),
        paginator.querySelector('.tabulator-page[data-page="prev"]'),
        paginator.querySelector('.tabulator-pages'),
        paginator.querySelector('.tabulator-page[data-page="next"]'),
        paginator.querySelector('.tabulator-page[data-page="last"]'),
    ].filter(Boolean);
    let sizeControl = paginator.querySelector(':scope > .petak__page-size-control');
    let navigation = paginator.querySelector(':scope > .petak__page-navigation');

    if ((label || pageSize) && !sizeControl) {
        sizeControl = document.createElement('span');
        sizeControl.className = 'petak__page-size-control';
        paginator.appendChild(sizeControl);
    }

    if (sizeControl) {
        if (label) sizeControl.appendChild(label);
        if (pageSize) sizeControl.appendChild(pageSize);
    }

    if (navigationItems.length && !navigation) {
        navigation = document.createElement('span');
        navigation.className = 'petak__page-navigation';
        navigation.setAttribute('role', 'group');
        navigation.setAttribute('aria-label', 'Pagination');
        paginator.appendChild(navigation);
    }

    if (navigation) {
        navigationItems.forEach((item) => navigation.appendChild(item));
    }
}

function bindColumnsMenu(element) {
    const toggle = element.querySelector('[data-petak-columns-toggle]');
    const menu = element.querySelector('[data-petak-columns-menu]');
    const ownerDocument = element.ownerDocument;

    if (!toggle || !menu) {
        return () => {};
    }

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.hidden = !open;
    };
    const close = () => setOpen(false);
    const onDocumentClick = (event) => {
        if (!element.contains(event.target)) {
            close();
        }
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            close();
            toggle.focus();
        }
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    ownerDocument.addEventListener('click', onDocumentClick);
    element.addEventListener('keydown', onKeyDown);

    return () => {
        ownerDocument.removeEventListener('click', onDocumentClick);
        element.removeEventListener('keydown', onKeyDown);
    };
}

export function fetchTransport({ endpoint, grid, method = 'GET' }) {
    let controller;
    let activeRequest;

    return {
        async load(request) {
            const fingerprint = JSON.stringify(request);

            if (activeRequest?.fingerprint === fingerprint) {
                return activeRequest.promise;
            }

            controller?.abort();
            controller = new AbortController();

            const url = new URL(endpoint, window.location.href);
            const options = {
                method,
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'X-Petak-Request': grid,
                },
            };

            if (method.toUpperCase() === 'GET') {
                url.searchParams.set('petak', grid);
                url.searchParams.set('petak_request', JSON.stringify(request));
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.headers['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
                options.body = JSON.stringify(request);
            }

            const promise = fetch(url, options).then(async (response) => {
                const result = await response.json().catch(() => null);

                if (!response.ok) {
                    const error = new Error(result?.message ?? `Petak request failed (${response.status}).`);
                    error.response = result;
                    throw error;
                }

                return result;
            }).finally(() => {
                if (activeRequest?.fingerprint === fingerprint) {
                    activeRequest = undefined;
                }
            });

            activeRequest = { fingerprint, promise };

            return promise;
        },
        cancel() {
            controller?.abort();
        },
        destroy() {
            controller?.abort();
            activeRequest = undefined;
        },
    };
}

export async function executePetakAction(config, action) {
    const exportConfig = action.type === 'export'
        ? config.exports?.find((candidate) => candidate.name === action.name)
        : null;
    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
            Accept: action.type === 'export' ? exportConfig?.mime ?? 'application/octet-stream' : 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
        },
        body: JSON.stringify({
            petak_action: {
                grid: config.name,
                ...action,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Petak action failed (${response.status}).`);
    }

    return action.type === 'export' ? response.blob() : response.json();
}

function stateStorage(config) {
    if (!config.state || config.state.store !== 'local-storage') {
        return null;
    }

    const key = `petak:${config.state.key}:v${config.state.version}`;

    return {
        load() {
            try {
                return JSON.parse(window.localStorage.getItem(key) ?? 'null');
            } catch {
                return null;
            }
        },
        save(state) {
            window.localStorage.setItem(key, JSON.stringify(state));
        },
        views() {
            return {
                load() {
                    try {
                        return JSON.parse(window.localStorage.getItem(`${key}:views`) ?? '{}');
                    } catch {
                        return {};
                    }
                },
                save(views) {
                    window.localStorage.setItem(`${key}:views`, JSON.stringify(views));
                },
            };
        },
    };
}

export function savePetakView(config, name, state) {
    const views = stateStorage(config)?.views();

    if (!views) {
        return;
    }

    views.save({ ...views.load(), [name]: state });
}

export function loadPetakViews(config) {
    return stateStorage(config)?.views().load() ?? {};
}

export function localTransport(initialRows = []) {
    return {
        async load() {
            return {
                version: '1',
                data: initialRows,
                meta: {
                    pagination: {
                        mode: 'local',
                        page: 1,
                        per_page: initialRows.length,
                        total: initialRows.length,
                        last_page: 1,
                        from: initialRows.length > 0 ? 1 : null,
                        to: initialRows.length || null,
                    },
                    aggregates: [],
                },
                errors: [],
            };
        },
    };
}

export function livewireTransport({ component, method = 'loadPetak' }) {
    if (!component?.call) {
        throw new Error('Petak could not resolve the owning Livewire component.');
    }

    let generation = 0;
    let destroyed = false;

    return {
        async load(request) {
            const current = ++generation;
            const result = await component.call(method, request);

            if (destroyed || current !== generation) {
                const error = new Error('Petak Livewire request was superseded.');
                error.name = 'AbortError';
                throw error;
            }

            return result;
        },
        cancel() {
            generation += 1;
        },
        destroy() {
            destroyed = true;
            generation += 1;
        },
    };
}

function canonicalRequest(config, params = {}, search = '') {
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
        };

        if (column.filter) {
            definition.headerFilter = column.filter.type === 'boolean' ? 'tickCross' : 'input';
            definition.headerFilterLiveFilter = column.filter.type === 'text';
        }

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
        if (fittingContent) {
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
        fitContentPending = false;
        fitColumns();

        if (!remote && search?.value) {
            applyLocalSearch();
        }
    });
    table.on?.('dataProcessed', () => {
        fitContentPending = true;
    });
    table.on?.('renderComplete', () => {
        structurePetakPaginator(target);

        if (fitContentPending) {
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

function initializeLifecycle() {
    if (lifecycleInitialized) {
        return;
    }

    lifecycleInitialized = true;

    document.addEventListener('petak:refresh', (event) => {
        refreshPetak(event.detail?.grid);
    });

    new MutationObserver((records) => {
        destroyDisconnectedPetak();

        records.forEach((record) => {
            record.addedNodes.forEach((node) => {
                if (node instanceof Element) {
                    initializePetak(node);
                }
            });
        });
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

export function refreshPetak(requestedGrid = null) {
    activeElements.forEach((element) => {
        const instance = instances.get(element);
        const config = JSON.parse(document.getElementById(element.dataset.petakConfig)?.textContent ?? '{}');

        if (!requestedGrid || requestedGrid === config.name) {
            instance?.reload();
        }
    });
}

export function destroyDisconnectedPetak() {
    activeElements.forEach((element) => {
        if (!element.isConnected) {
            instances.get(element)?.destroy();
        }
    });
}

export function initializePetak(root = document) {
    initializeLifecycle();

    if (root instanceof Element && root.matches('[data-petak-grid]')) {
        createPetakGrid(root);
    }

    root.querySelectorAll('[data-petak-grid]').forEach((element) => createPetakGrid(element));
}
