import { executePetakAction } from '../../core/actions.js';
import { activeElements, instances } from '../../core/registry.js';
import { bindColumnsMenu } from '../../dom/columns-menu.js';
import { fetchTransport } from '../../transports/fetch.js';
import { livewireTransport } from '../../transports/livewire.js';
import { debounce } from './dom.js';
import { localResult } from './data.js';
import { applyStickyColumns, createLayoutState, nextCollapsedColumns } from './layout.js';
import { createPluginScope } from './plugins.js';
import { nativeRequest } from './request.js';
import { createNativeState } from './state.js';
import { renderNativeTable, runExport } from './table.js';

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

    return fetchTransport({ endpoint: config.endpoint, grid: config.name });
}

function firstRemoteResult(config) {
    if (config.mode !== 'remote' || !config.initialResult) {
        return () => null;
    }

    let used = false;

    return () => {
        if (used) {
            return null;
        }

        used = true;

        return config.initialResult;
    };
}

function setBusy(element, busy) {
    element.classList.toggle('petak-is-loading', busy);
    element.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function rowIdentity(config, row, index) {
    return `${row?.[config.row_key ?? 'id'] ?? index}`;
}

function captureFocus(element) {
    const active = document.activeElement;

    if (!active || !element.contains(active)) {
        return null;
    }

    let selector = null;
    let index = 0;

    if (active.matches('[data-petak-search]')) {
        selector = '[data-petak-search]';
    } else if (active.matches('[data-petak-filter-input]')) {
        selector = `[data-petak-filter-input="${window.CSS?.escape?.(active.dataset.petakFilterInput) ?? active.dataset.petakFilterInput}"]`;
        index = [...element.querySelectorAll(selector)].indexOf(active);
    } else if (active.matches('[data-petak-filter-operator]')) {
        selector = `[data-petak-filter-operator="${window.CSS?.escape?.(active.dataset.petakFilterOperator) ?? active.dataset.petakFilterOperator}"]`;
    }

    if (!selector) {
        return null;
    }

    return {
        selector,
        index: Math.max(0, index),
        start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
        end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
    };
}

function restoreFocus(element, snapshot) {
    if (!snapshot) {
        return;
    }

    const matches = [...element.querySelectorAll(snapshot.selector)];
    const next = matches[snapshot.index] ?? matches[0];

    if (!next) {
        return;
    }

    next.focus({ preventScroll: true });

    if (
        snapshot.start !== null
        && snapshot.end !== null
        && typeof next.setSelectionRange === 'function'
        && ['search', 'text', 'email', 'url', 'tel', 'password', 'number'].includes(next.type)
    ) {
        try {
            next.setSelectionRange(snapshot.start, snapshot.end);
        } catch {
            // Some input types expose setSelectionRange but reject selection.
        }
    }
}

export function createNativeGrid(element, options = {}) {
    if (instances.has(element)) {
        return instances.get(element);
    }

    const configElement = document.getElementById(element.dataset.petakConfig);
    const config = options.config ?? JSON.parse(configElement?.textContent ?? '{}');
    const target = element.querySelector('[data-petak-renderer]');
    const status = element.querySelector('[data-petak-status]');
    const search = element.querySelector('[data-petak-search]');
    const wireId = element.closest('[wire\\:id]')?.getAttribute('wire:id');
    const livewireComponent = wireId ? window.Livewire?.find(wireId) : null;
    const transport = resolveTransport({ config, livewireComponent, options });
    const stateStore = createNativeState(config);
    const plugins = createPluginScope();
    const unbindColumnsMenu = bindColumnsMenu(element);
    const preload = firstRemoteResult(config);
    let result = config.mode === 'local' ? localResult(config, stateStore.get()) : (config.initialResult ?? null);
    let layoutState = createLayoutState();
    let destroyed = false;
    let layoutFrame;

    if (search) {
        search.value = stateStore.get().search ?? '';
    }

    async function load() {
        const state = stateStore.get();

        if (config.mode === 'local') {
            result = localResult(config, state);
            render();

            return;
        }

        const initial = preload();

        if (initial) {
            result = initial;
            render();

            return;
        }

        setBusy(element, true);
        status.textContent = '';
        element.classList.remove('petak-has-error');

        try {
            result = await transport.load(nativeRequest(config, state));
            render();
        } catch (error) {
            if (error.name !== 'AbortError') {
                status.textContent = error.message;
                element.classList.add('petak-has-error');
            }
        } finally {
            setBusy(element, false);
        }
    }

    function scheduleLayout() {
        window.cancelAnimationFrame(layoutFrame);
        layoutFrame = window.requestAnimationFrame(() => {
            if (destroyed) {
                return;
            }

            const next = nextCollapsedColumns({
                root: target,
                config,
                state: stateStore.get(),
                current: layoutState.collapsed,
            });
            const changed = next.size !== layoutState.collapsed.size
                || [...next].some((key) => !layoutState.collapsed.has(key));

            if (changed) {
                layoutState = { collapsed: next };
                render();

                return;
            }

            applyStickyColumns({ root: target, config });
        });
    }

    function render() {
        const focus = captureFocus(element);

        renderNativeTable({
            root: target,
            config,
            state: stateStore.get(),
            result,
            layoutState,
            plugins,
        });
        restoreFocus(element, focus);
        scheduleLayout();
    }

    const pendingFilters = new Map();
    const flushFilters = debounce(() => {
        const details = [...pendingFilters.values()];
        pendingFilters.clear();

        stateStore.update((state) => {
            details.forEach((detail) => {
                state.filters[detail.field] = {
                    operator: detail.operator,
                    value: detail.value,
                };
            });
            state.page.number = 1;

            return state;
        });
        load();
    }, 250);

    function bindEvents() {
        target.addEventListener('click', (event) => {
            const sort = event.target.closest('[data-petak-sort]');
            const page = event.target.closest('[data-petak-page]');
            const toggle = event.target.closest('[data-petak-toggle-details]');

            if (sort) {
                const field = sort.dataset.petakSort;
                stateStore.update((state) => {
                    const current = state.sort.find((item) => item.field === field)?.dir ?? null;
                    const direction = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
                    state.sort = direction ? [{ field, dir: direction }] : [];
                    state.page.number = 1;

                    return state;
                });
                load();
            }

            if (page) {
                stateStore.update((state) => {
                    state.page.number = Number(page.dataset.petakPage);

                    return state;
                }, { persist: false });
                load();
            }

            if (toggle) {
                const key = toggle.dataset.petakToggleDetails;
                stateStore.update((state) => {
                    const defaultOpen = Boolean(config.responsive?.collapse_start_open) && !state.collapsedToggled.has(key);
                    const open = state.expanded.has(key) || defaultOpen;

                    state.collapsedToggled.add(key);

                    if (open) {
                        state.expanded.delete(key);
                    } else {
                        state.expanded.add(key);
                    }

                    return state;
                }, { persist: false });
                render();
            }
        });

        target.addEventListener('keydown', (event) => {
            const sort = event.target.closest('[data-petak-sort]');

            if (!sort || !['Enter', ' '].includes(event.key)) {
                return;
            }

            event.preventDefault();
            sort.click();
        });

        target.addEventListener('change', (event) => {
            const pageSize = event.target.closest('[data-petak-page-size]');
            const row = event.target.closest('[data-petak-select-row]');
            const all = event.target.closest('[data-petak-select-all]');

            if (pageSize) {
                stateStore.update((state) => {
                    state.page.size = Number(pageSize.value);
                    state.page.number = 1;

                    return state;
                });
                load();
            }

            if (row) {
                stateStore.update((state) => {
                    if (row.checked) {
                        state.selected.add(row.value);
                    } else {
                        state.selected.delete(row.value);
                    }

                    return state;
                }, { persist: false });
                render();
            }

            if (all) {
                const checked = all.checked;
                stateStore.update((state) => {
                    (result?.data ?? []).forEach((item, index) => {
                        const key = rowIdentity(config, item, index);
                        if (checked) {
                            state.selected.add(key);
                        } else {
                            state.selected.delete(key);
                        }
                    });

                    return state;
                }, { persist: false });
                render();
            }
        });

        target.addEventListener('petak:filter-change', (event) => {
            pendingFilters.set(event.detail.field, event.detail);
            flushFilters();
        });

        element.querySelectorAll('[data-petak-column]').forEach((toggle) => {
            toggle.checked = stateStore.get().columns.visibility[toggle.value] !== false;
            toggle.addEventListener('change', () => {
                stateStore.update((state) => {
                    state.columns.visibility[toggle.value] = toggle.checked;

                    return state;
                });
                layoutState = createLayoutState();
                render();
            });
        });

        if (search) {
            search.addEventListener('input', debounce(() => {
                stateStore.update((state) => {
                    state.search = search.value;
                    state.page.number = 1;

                    return state;
                });
                load();
            }, 300));
        }

        element.querySelectorAll('[data-petak-bulk]').forEach((button) => {
            button.addEventListener('click', async () => {
                await executePetakAction(config, {
                    type: 'bulk',
                    name: button.dataset.petakBulk,
                    mode: 'selected',
                    keys: [...stateStore.get().selected],
                    request: nativeRequest(config, stateStore.get()),
                });
                await load();
            });
        });

        element.querySelectorAll('[data-petak-export]').forEach((button) => {
            button.addEventListener('click', async () => {
                await runExport(config, nativeRequest(config, stateStore.get()), button.dataset.petakExport);
            });
        });
    }

    const resizeObserver = typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => scheduleLayout());
    resizeObserver?.observe(target);
    window.addEventListener('resize', scheduleLayout);
    bindEvents();
    load();

    const instance = {
        reload: load,
        destroy() {
            destroyed = true;
            globalThis.window?.cancelAnimationFrame?.(layoutFrame);
            resizeObserver?.disconnect();
            globalThis.window?.removeEventListener?.('resize', scheduleLayout);
            unbindColumnsMenu();
            plugins.destroy();
            stateStore.destroy();
            transport?.destroy?.();
            instances.delete(element);
            activeElements.delete(element);
        },
    };

    instances.set(element, instance);
    activeElements.add(element);

    return instance;
}
