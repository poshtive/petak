import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { executePetakAction } from '../core/actions.js';
import { activeElements, instances } from '../core/registry.js';
import { stateStorage } from '../core/state.js';
import { bindColumnsMenu } from '../dom/columns-menu.js';
import { structurePetakPaginator } from '../dom/paginator.js';
import { fetchTransport } from '../transports/fetch.js';
import { livewireTransport } from '../transports/livewire.js';
import { localTransport } from '../transports/local.js';
import { createRemoteDataAdapter } from './tabulator/data.js';
import { buildTabulatorOptions } from './tabulator/options.js';
import { createLocalSearch, searchableFields } from './tabulator/search.js';
import { serializableFilters, serializableSorters } from './tabulator/state.js';

function resolveTransport({ config, livewireComponent, options }) {
    if (options.transport) {
        return options.transport;
    }

    if (config.transport === 'livewire') {
        return livewireTransport({
            component: livewireComponent,
            method: config.livewire_method,
        });
    }

    if (config.mode === 'remote') {
        return fetchTransport({ endpoint: config.endpoint, grid: config.name });
    }

    return localTransport(config.initialResult?.data ?? []);
}

function persistTableState({ storage, table, tableReady, config, search }) {
    if (!storage || !tableReady()) {
        return;
    }

    storage.save({
        pageSize: table.getPageSize?.() ?? config.pagination.default_page_size,
        sort: serializableSorters(table.getSorters?.() ?? []),
        filters: serializableFilters(table.getFilters?.() ?? []),
        columns: {
            order: table.getColumns?.().map((column) => column.getField()) ?? [],
            visibility: Object.fromEntries(
                table.getColumns?.().map((column) => [column.getField(), column.isVisible()]) ?? [],
            ),
        },
        search: search?.value ?? '',
    });
}

function bindColumnToggles({ element, table, persistedState, persistState }) {
    element.querySelectorAll('[data-petak-column]').forEach((toggle) => {
        if (persistedState?.columns?.visibility?.[toggle.value] !== undefined) {
            toggle.checked = persistedState.columns.visibility[toggle.value];
        }

        toggle.addEventListener('change', () => {
            table.getColumn?.(toggle.value)?.toggle();
            persistState();
        });
    });
}

function bindActions({ element, table, config, dataAdapter, instance, rowKey, status }) {
    element.querySelectorAll('[data-petak-bulk]').forEach((button) => {
        button.addEventListener('click', async () => {
            await executePetakAction(config, {
                type: 'bulk',
                name: button.dataset.petakBulk,
                mode: 'selected',
                keys: table.getSelectedData?.().map((row) => row[rowKey]) ?? [],
                request: dataAdapter.getLastRequest(),
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
                request: dataAdapter.getLastRequest(),
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${config.name}.${exportConfig?.extension ?? button.dataset.petakExport}`;
            link.click();
            URL.revokeObjectURL(link.href);
        });
    });

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
            if (status) {
                status.textContent = error.message;
            }
            element.classList.add('petak-has-error');
        }
    });
}

function reloadRemoteTable(table) {
    if (typeof table.setPage === 'function') {
        return table.setPage(1);
    }

    return table.setData?.() ?? Promise.resolve();
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
    const remote = config.mode === 'remote';
    const wireId = element.closest('[wire\\:id]')?.getAttribute('wire:id');
    const livewireComponent = wireId ? window.Livewire?.find(wireId) : null;
    const storage = stateStorage(config);
    const persistedState = storage?.load();
    const rowKey = config.row_key ?? 'id';
    const transport = resolveTransport({ config, livewireComponent, options });

    if (search && typeof persistedState?.search === 'string') {
        search.value = persistedState.search;
    }

    const dataAdapter = createRemoteDataAdapter({
        config,
        element,
        status,
        transport,
        search,
    });
    const table = new Tabulator(target, buildTabulatorOptions({
        config,
        persistedState,
        remote,
        rowKey,
        dataAdapter,
    }));
    const unbindColumnsMenu = bindColumnsMenu(element);
    const applyLocalSearch = createLocalSearch(table, searchableFields(config), search);
    let ready = false;

    const tableReady = () => ready;
    const persistState = () => persistTableState({
        storage,
        table,
        tableReady,
        config,
        search,
    });

    structurePetakPaginator(target);

    table.on?.('tableBuilt', () => {
        ready = true;

        if (!remote && search?.value) {
            applyLocalSearch();
        }
    });
    table.on?.('renderComplete', () => {
        structurePetakPaginator(target);
    });
    table.on?.('columnMoved', persistState);
    table.on?.('columnVisibilityChanged', persistState);
    table.on?.('pageSizeChanged', persistState);
    table.on?.('dataSorted', persistState);
    table.on?.('dataFiltered', persistState);

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

    bindColumnToggles({ element, table, persistedState, persistState });
    bindActions({ element, table, config, dataAdapter, instance, rowKey, status });

    if (search) {
        let timeout;
        search.addEventListener('input', () => {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                persistState();

                if (remote) {
                    reloadRemoteTable(table);
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
