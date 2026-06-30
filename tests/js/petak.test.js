import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createPetakGrid,
    destroyDisconnectedPetak,
    initializePetak,
    livewireTransport,
    localTransport,
    refreshPetak,
    registerFilter,
    stateStorage,
} from '../../resources/js/petak.js';
import { nextCollapsedColumns } from '../../resources/js/renderers/native/layout.js';
import { createPluginScope } from '../../resources/js/renderers/native/plugins.js';
import { renderNativeTable } from '../../resources/js/renderers/native/table.js';

function baseColumn(overrides = {}) {
    return {
        key: 'id',
        label: 'ID',
        visible: true,
        sortable: false,
        searchable: false,
        trusted_html: false,
        align: 'start',
        vertical_align: null,
        responsive_priority: 0,
        sizing: {
            mode: 'fluid',
            width: null,
            min_width: null,
            max_width: null,
        },
        pin: null,
        filter: null,
        ...overrides,
    };
}

function mountGrid(config, toolbar = '') {
    document.body.innerHTML = `
        <div data-petak-grid data-petak-config="grid-config">
            ${toolbar}
            <div data-petak-renderer></div>
            <div data-petak-status></div>
        </div>
        <script id="grid-config" type="application/json">${JSON.stringify({
            version: '1',
            renderer: 'native',
            name: 'users',
            mode: 'local',
            row_key: 'id',
            columns: [],
            initialResult: { data: [] },
            pagination: { default_page_size: 25, page_sizes: [25] },
            responsive: { layout: null },
            renderer_options: {
                native: {
                    sticky: {
                        max_frozen_width_ratio: 0.55,
                        disable_below: 480,
                    },
                },
            },
            ...config,
        })}</script>
    `;

    return document.querySelector('[data-petak-grid]');
}

describe('Petak native renderer', () => {
    beforeEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
        global.fetch = undefined;
        const values = new Map();
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key) => values.get(key) ?? null,
                setItem: (key, value) => values.set(key, value),
                removeItem: (key) => values.delete(key),
                clear: () => values.clear(),
            },
        });
    });

    it('normalizes local rows into a canonical result', async () => {
        const result = await localTransport([{ id: 1 }]).load({});

        expect(result.data).toEqual([{ id: 1 }]);
        expect(result.meta.pagination.total).toBe(1);
    });

    it('cancels superseded Livewire responses', async () => {
        const pending = [];
        const component = {
            call: vi.fn(() => new Promise((resolve) => pending.push(resolve))),
        };
        const transport = livewireTransport({ component });
        const first = transport.load({ page: 1 });
        const second = transport.load({ page: 2 });

        pending[0]({ data: ['old'] });
        pending[1]({ data: ['new'] });

        await expect(first).rejects.toMatchObject({ name: 'AbortError' });
        await expect(second).resolves.toEqual({ data: ['new'] });
    });

    it('stores grid state in local storage', () => {
        const storage = stateStorage({
            state: {
                key: 'users',
                store: 'local-storage',
                version: 1,
            },
        });

        storage.save({ pageSize: 50 });

        expect(storage.load()).toEqual({ pageSize: 50 });
    });

    it('renders local rows with pagination and sorting', () => {
        const element = mountGrid({
            columns: [
                baseColumn({ key: 'id', label: 'ID', sortable: true, align: 'end', pin: 'left' }),
                baseColumn({ key: 'name', label: 'Name', sortable: true, searchable: true }),
            ],
            appearance: { bordered: true, striped: true, density: 'compact' },
            initialResult: {
                data: [
                    { id: 2, name: 'Beta' },
                    { id: 1, name: 'Alpha' },
                ],
            },
            pagination: { default_page_size: 1, page_sizes: [1, 2] },
        });

        createPetakGrid(element);

        expect(document.querySelector('.petak-native__table')).not.toBeNull();
        expect(document.querySelector('.petak-native__table').classList.contains('petak__table')).toBe(false);
        expect(document.querySelector('.petak-native__table').classList.contains('is-bordered')).toBe(true);
        expect(document.querySelector('.petak-native__table').classList.contains('is-striped')).toBe(true);
        expect(document.querySelector('.petak-native__table').classList.contains('is-compact')).toBe(true);
        expect(document.querySelector('.petak-native__table').parentElement.classList.contains('petak-native__table-scroll')).toBe(true);
        expect(document.querySelector('.petak-native__table').parentElement.classList.contains('is-bordered')).toBe(true);
        expect(document.querySelector('.petak-native__table-scroll').contains(document.querySelector('.petak-native__pagination'))).toBe(false);
        expect(document.querySelector('.petak-native__table').style.getPropertyValue('--petak-native-table-min-width')).toBe('256px');
        expect(document.querySelector('.petak-native__control-cell')).toBeNull();
        expect(document.querySelector('.petak-native__filters-row')).toBeNull();
        expect(document.querySelector('th[data-petak-sort="name"]')).not.toBeNull();
        expect(document.querySelector('th[data-petak-sort="name"] button')).toBeNull();
        expect(document.querySelector('tbody td[data-petak-column="name"]').textContent).toBe('Beta');
        expect(document.querySelector('.petak__pagination-summary').textContent).toBe('Showing 1 to 1 of 2 entries');
        expect([...document.querySelectorAll('.petak-native__page-button')].map((button) => button.textContent)).toEqual([
            'First',
            'Prev',
            '1',
            '2',
            'Next',
            'Last',
        ]);

        document.querySelector('[data-petak-sort="name"]').click();

        expect(document.querySelector('tbody td[data-petak-column="name"]').textContent).toBe('Alpha');
    });

    it('keeps global selection checkbox in none partial and all states', () => {
        const element = mountGrid({
            bulk_actions: [{ name: 'delete', label: 'Delete' }],
            columns: [baseColumn({ key: 'name', label: 'Name' })],
            initialResult: {
                data: [
                    { id: 1, name: 'Ada' },
                    { id: 2, name: 'Grace' },
                ],
            },
        });

        createPetakGrid(element);

        let all = document.querySelector('[data-petak-select-all]');
        expect(all.closest('th').classList.contains('petak-native__selection-cell')).toBe(true);
        expect(all.checked).toBe(false);
        expect(all.indeterminate).toBe(false);
        expect(all.dataset.petakSelectionState).toBe('none');

        document.querySelector('[data-petak-select-row="1"]').checked = true;
        document.querySelector('[data-petak-select-row="1"]').dispatchEvent(new Event('change', { bubbles: true }));

        all = document.querySelector('[data-petak-select-all]');
        expect(all.checked).toBe(false);
        expect(all.indeterminate).toBe(true);
        expect(all.dataset.petakSelectionState).toBe('partial');

        all.checked = true;
        all.dispatchEvent(new Event('change', { bubbles: true }));

        all = document.querySelector('[data-petak-select-all]');
        expect(all.checked).toBe(true);
        expect(all.indeterminate).toBe(false);
        expect(all.dataset.petakSelectionState).toBe('all');

        all.checked = false;
        all.dispatchEvent(new Event('change', { bubbles: true }));

        all = document.querySelector('[data-petak-select-all]');
        expect(all.checked).toBe(false);
        expect(all.indeterminate).toBe(false);
        expect(all.dataset.petakSelectionState).toBe('none');
    });

    it('wraps cell values in an overflow-safe content box', () => {
        const element = mountGrid({
            columns: [
                baseColumn({
                    key: 'action',
                    label: 'Action',
                    trusted_html: true,
                    sizing: { mode: 'compact', width: 72, min_width: null, max_width: 72 },
                }),
            ],
            initialResult: {
                data: [{ id: 1, action: '<button>Very long action label</button>' }],
            },
        });

        createPetakGrid(element);

        const cell = document.querySelector('td[data-petak-column="action"]');
        expect(cell.querySelector('.petak-native__cell-content')).not.toBeNull();
        expect(cell.getAttribute('data-sizing')).toBe('compact');
    });

    it('renders DataTables-style pagination with ellipses for larger result sets', () => {
        document.body.innerHTML = '<div id="root"></div>';

        renderNativeTable({
            root: document.getElementById('root'),
            config: {
                row_key: 'id',
                columns: [baseColumn({ key: 'name', label: 'Name' })],
                pagination: { default_page_size: 10, page_sizes: [10, 25] },
                responsive: { layout: null },
            },
            state: {
                page: { number: 5, size: 10 },
                sort: [],
                filters: {},
                search: '',
                columns: { visibility: { name: true } },
                expanded: new Set(),
                collapsedToggled: new Set(),
                selected: new Set(),
            },
            result: {
                data: [{ id: 41, name: 'Ada' }],
                meta: { pagination: { page: 5, per_page: 10, total: 100, last_page: 10, from: 41, to: 50 } },
            },
            layoutState: { collapsed: new Set() },
            plugins: createPluginScope(),
        });

        expect([...document.querySelectorAll('.petak-native__page-button, .petak-native__page-ellipsis')].map((node) => node.textContent)).toEqual([
            'First',
            'Prev',
            '1',
            '...',
            '4',
            '5',
            '6',
            '...',
            '10',
            'Next',
            'Last',
        ]);
    });

    it('filters local rows through schema-driven controls', async () => {
        vi.useFakeTimers();
        const element = mountGrid({
            columns: [
                baseColumn({
                    key: 'name',
                    label: 'Name',
                    searchable: true,
                    filter: {
                        type: 'text',
                        operator: 'contains',
                        operators: ['contains'],
                        component: 'input',
                        input_type: 'text',
                        placeholder: '',
                        options: [],
                        multiple: false,
                        depends_on: [],
                    },
                }),
                baseColumn({
                    key: 'status',
                    label: 'Status',
                    filter: {
                        type: 'select',
                        operator: 'equals',
                        operators: ['equals', 'not_equals'],
                        component: 'select',
                        input_type: 'text',
                        placeholder: null,
                        options: { active: 'Active', paused: 'Paused' },
                        multiple: false,
                        depends_on: [],
                    },
                }),
            ],
            initialResult: {
                data: [
                    { id: 1, name: 'Alpha', status: 'active' },
                    { id: 2, name: 'Beta', status: 'paused' },
                ],
            },
        });

        createPetakGrid(element);

        const select = document.querySelector('select[data-petak-filter-input="status"]');
        select.focus();
        select.value = 'paused';
        select.dispatchEvent(new Event('change', { bubbles: true }));

        await vi.advanceTimersByTimeAsync(260);

        expect([...document.querySelectorAll('tbody tr')]).toHaveLength(1);
        expect(document.querySelector('tbody td[data-petak-column="name"]').textContent).toBe('Beta');
        expect(document.activeElement.dataset.petakFilterInput).toBe('status');
    });

    it('supports custom filter plugins without changing the backend schema', async () => {
        vi.useFakeTimers();
        registerFilter('test-filter', {
            mount(el, { setValue }) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.testFilter = 'true';
                button.addEventListener('click', () => setValue('Beta'));
                el.append(button);
            },
        });
        const element = mountGrid({
            columns: [
                baseColumn({
                    key: 'name',
                    label: 'Name',
                    filter: {
                        type: 'text',
                        operator: 'contains',
                        operators: ['contains'],
                        component: 'test-filter',
                        input_type: 'text',
                        placeholder: '',
                        options: [],
                        multiple: false,
                        depends_on: [],
                    },
                }),
            ],
            initialResult: {
                data: [
                    { id: 1, name: 'Alpha' },
                    { id: 2, name: 'Beta' },
                ],
            },
        });

        createPetakGrid(element);
        document.querySelector('[data-test-filter]').click();

        await vi.advanceTimersByTimeAsync(260);

        expect(document.querySelector('tbody td[data-petak-column="name"]').textContent).toBe('Beta');
    });

    it('reloads matching remote grids and destroys disconnected instances', async () => {
        const transport = {
            load: vi.fn(() => Promise.resolve({
                data: [{ id: 1, name: 'Ada' }],
                meta: { pagination: { page: 1, per_page: 25, total: 1, last_page: 1, from: 1, to: 1 } },
            })),
            destroy: vi.fn(),
        };
        const element = mountGrid({
            mode: 'remote',
            endpoint: '/users',
            columns: [baseColumn({ key: 'name', label: 'Name' })],
            initialResult: undefined,
        });

        const instance = createPetakGrid(element, { transport });
        expect(createPetakGrid(element)).toBe(instance);
        await Promise.resolve();

        refreshPetak('other');
        expect(transport.load).toHaveBeenCalledTimes(1);

        refreshPetak('users');
        await Promise.resolve();
        expect(transport.load).toHaveBeenCalledTimes(2);

        element.remove();
        destroyDisconnectedPetak();
        expect(transport.destroy).toHaveBeenCalledOnce();
    });

    it('persists column visibility through the columns menu', async () => {
        vi.useFakeTimers();
        const element = mountGrid({
            state: {
                key: 'columns',
                store: 'local-storage',
                version: 1,
            },
            columns: [
                baseColumn({ key: 'id', label: 'ID' }),
                baseColumn({ key: 'name', label: 'Name' }),
            ],
            initialResult: {
                data: [{ id: 1, name: 'Ada' }],
            },
        }, `
            <div class="petak__columns">
                <button class="petak__columns-toggle" type="button" aria-expanded="false" data-petak-columns-toggle>
                    <span>Columns</span>
                    <span class="petak__columns-caret" aria-hidden="true"></span>
                </button>
                <div class="petak__columns-menu" hidden data-petak-columns-menu>
                    <label><input type="checkbox" value="name" data-petak-column checked> Name</label>
                </div>
            </div>
        `);

        createPetakGrid(element);

        const menuToggle = document.querySelector('[data-petak-columns-toggle]');
        const menu = document.querySelector('[data-petak-columns-menu]');

        expect(menu.hidden).toBe(true);
        menuToggle.click();
        expect(menu.hidden).toBe(false);

        const toggle = document.querySelector('[data-petak-column]');
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));

        await vi.advanceTimersByTimeAsync(120);

        expect(document.querySelector('[data-petak-column="name"]')).toBeNull();
        expect(window.localStorage.getItem('petak:columns:v1')).toContain('"name":false');
    });

    it('supports native no-value and range filter operators locally', async () => {
        vi.useFakeTimers();
        const element = mountGrid({
            columns: [
                baseColumn({
                    key: 'name',
                    label: 'Name',
                    filter: {
                        type: 'text',
                        operator: 'contains',
                        operators: ['contains', 'is_empty', 'is_not_empty'],
                        component: 'input',
                        input_type: 'text',
                        placeholder: '',
                        options: [],
                        multiple: false,
                        depends_on: [],
                    },
                }),
                baseColumn({
                    key: 'score',
                    label: 'Score',
                    filter: {
                        type: 'number',
                        operator: 'equals',
                        operators: ['equals', 'between'],
                        component: 'input',
                        input_type: 'number',
                        placeholder: '',
                        options: [],
                        multiple: false,
                        depends_on: [],
                    },
                }),
            ],
            initialResult: {
                data: [
                    { id: 1, name: '', score: 5 },
                    { id: 2, name: 'Beta', score: 15 },
                    { id: 3, name: 'Gamma', score: 30 },
                ],
            },
        });

        createPetakGrid(element);

        const nameOperator = document.querySelector('[data-petak-filter-operator="name"]');
        nameOperator.value = 'is_empty';
        nameOperator.dispatchEvent(new Event('change', { bubbles: true }));

        await vi.advanceTimersByTimeAsync(260);

        expect([...document.querySelectorAll('tbody tr')]).toHaveLength(1);
        expect(document.querySelector('tbody td[data-petak-column="name"]').textContent).toBe('');

        const resetNameOperator = document.querySelector('[data-petak-filter-operator="name"]');
        resetNameOperator.value = 'contains';
        resetNameOperator.dispatchEvent(new Event('change', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(260);

        const scoreOperator = document.querySelector('[data-petak-filter-operator="score"]');
        scoreOperator.value = 'between';
        scoreOperator.dispatchEvent(new Event('change', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(260);

        const scoreInputs = document.querySelectorAll('[data-petak-filter-input="score"]');
        scoreInputs[0].value = '10';
        scoreInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        scoreInputs[1].value = '20';
        scoreInputs[1].dispatchEvent(new Event('input', { bubbles: true }));

        await vi.advanceTimersByTimeAsync(260);

        expect([...document.querySelectorAll('tbody tr')]).toHaveLength(1);
        expect(document.querySelector('tbody td[data-petak-column="name"]').textContent).toBe('Beta');
    });

    it('calculates responsive hidden columns for hide and collapse layouts', () => {
        document.body.innerHTML = `
            <div id="root">
                <table class="petak-native__table">
                    <thead>
                        <tr>
                            <th data-petak-column="name"></th>
                            <th data-petak-column="email"></th>
                        </tr>
                    </thead>
                </table>
            </div>
        `;
        const root = document.getElementById('root');
        const table = root.querySelector('table');

        Object.defineProperty(root, 'clientWidth', { configurable: true, value: 100 });
        Object.defineProperty(table, 'scrollWidth', { configurable: true, value: 300 });
        root.querySelector('[data-petak-column="name"]').getBoundingClientRect = () => ({ width: 80 });
        root.querySelector('[data-petak-column="email"]').getBoundingClientRect = () => ({ width: 130 });

        const config = {
            responsive: { layout: 'hide' },
            columns: [
                baseColumn({ key: 'name', responsive_priority: 1 }),
                baseColumn({ key: 'email', responsive_priority: 2 }),
            ],
        };
        const state = {
            columns: { visibility: { name: true, email: true } },
        };

        expect([...nextCollapsedColumns({
            root,
            config,
            state,
            current: new Set(),
        })]).toEqual(['email', 'name']);

        config.responsive.layout = 'collapse';
        expect([...nextCollapsedColumns({
            root,
            config,
            state,
            current: new Set(),
        })]).toEqual(['email', 'name']);
    });

    it('opens responsive collapse detail rows by default when configured', () => {
        document.body.innerHTML = '<div id="root"></div>';
        const config = {
            row_key: 'id',
            columns: [
                baseColumn({ key: 'name', label: 'Name' }),
                baseColumn({ key: 'email', label: 'Email', responsive_priority: 1 }),
            ],
            responsive: {
                layout: 'collapse',
                collapse_start_open: true,
            },
            pagination: { default_page_size: 25, page_sizes: [25] },
        };
        const state = {
            page: { number: 1, size: 25 },
            sort: [],
            filters: {},
            search: '',
            columns: { visibility: { name: true, email: true } },
            expanded: new Set(),
            collapsedToggled: new Set(),
            selected: new Set(),
        };

        renderNativeTable({
            root: document.getElementById('root'),
            config,
            state,
            result: {
                data: [{ id: 1, name: 'Ada', email: 'ada@example.com' }],
                meta: { pagination: { page: 1, per_page: 25, total: 1, last_page: 1, from: 1, to: 1 } },
            },
            layoutState: { collapsed: new Set(['email']) },
            plugins: createPluginScope(),
        });

        expect(document.querySelector('.petak-native__details-row')).not.toBeNull();
        expect(document.querySelector('.petak-native__details-row').textContent).toContain('ada@example.com');
        expect(document.querySelector('.petak-native__details-toggle .petak-native__toggle-icon')).not.toBeNull();
        expect(document.querySelector('.petak-native__details-toggle').closest('td').classList.contains('petak-native__details-cell')).toBe(true);
        expect(document.querySelector('.petak-native__details-cell .petak-native__row-check')).toBeNull();
    });

    it('keeps responsive details and row selection in separate control columns', () => {
        document.body.innerHTML = '<div id="root"></div>';
        const config = {
            row_key: 'id',
            bulk_actions: [{ name: 'delete', label: 'Delete' }],
            columns: [
                baseColumn({ key: 'name', label: 'Name' }),
                baseColumn({ key: 'email', label: 'Email', responsive_priority: 1 }),
            ],
            responsive: { layout: 'collapse' },
            pagination: { default_page_size: 25, page_sizes: [25] },
        };

        renderNativeTable({
            root: document.getElementById('root'),
            config,
            state: {
                page: { number: 1, size: 25 },
                sort: [],
                filters: {},
                search: '',
                columns: { visibility: { name: true, email: true } },
                expanded: new Set(),
                collapsedToggled: new Set(),
                selected: new Set(),
            },
            result: {
                data: [{ id: 1, name: 'Ada', email: 'ada@example.com' }],
                meta: { pagination: { page: 1, per_page: 25, total: 1, last_page: 1, from: 1, to: 1 } },
            },
            layoutState: { collapsed: new Set(['email']) },
            plugins: createPluginScope(),
        });

        expect(document.querySelectorAll('col.petak-native__control-col')).toHaveLength(2);
        expect(document.querySelector('.petak-native__details-cell [data-petak-toggle-details]')).not.toBeNull();
        expect(document.querySelector('.petak-native__selection-cell [data-petak-select-row]')).not.toBeNull();
        expect(document.querySelector('.petak-native__table').style.getPropertyValue('--petak-native-table-min-width')).toBe('204px');
    });

    it('keeps responsive collapse active after the collapsed columns leave the table DOM', () => {
        document.body.innerHTML = `
            <div id="root">
                <table class="petak-native__table">
                    <thead>
                        <tr>
                            <th class="petak-native__control-cell"></th>
                            <th data-petak-column="name"></th>
                        </tr>
                    </thead>
                </table>
            </div>
        `;
        const root = document.getElementById('root');
        const table = root.querySelector('table');

        Object.defineProperty(root, 'clientWidth', { configurable: true, value: 180 });
        Object.defineProperty(table, 'scrollWidth', { configurable: true, value: 180 });
        root.querySelector('.petak-native__control-cell').getBoundingClientRect = () => ({ width: 52 });
        root.querySelector('[data-petak-column="name"]').getBoundingClientRect = () => ({ width: 120 });

        expect([...nextCollapsedColumns({
            root,
            config: {
                responsive: { layout: 'collapse' },
                columns: [
                    baseColumn({ key: 'name', responsive_priority: 0 }),
                    baseColumn({
                        key: 'email',
                        responsive_priority: 1,
                        sizing: { mode: 'fluid', width: 180, min_width: null, max_width: null },
                    }),
                ],
            },
            state: {
                columns: { visibility: { name: true, email: true } },
            },
            current: new Set(['email']),
        })]).toEqual(['email']);
    });

    it('initializes grids once through the document lifecycle', () => {
        const element = mountGrid({
            columns: [baseColumn({ key: 'name', label: 'Name' })],
            initialResult: { data: [{ id: 1, name: 'Ada' }] },
        });

        initializePetak(document);
        initializePetak(document);

        expect(createPetakGrid(element)).toBeTruthy();
        expect(document.querySelectorAll('.petak-native__table')).toHaveLength(1);
    });
});
