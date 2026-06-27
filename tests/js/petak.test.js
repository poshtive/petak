import { beforeEach, describe, expect, it, vi } from 'vitest';

const tables = [];

vi.mock('tabulator-tables', () => ({
    TabulatorFull: class {
        constructor(element, options) {
            this.element = element;
            this.options = options;
            this.handlers = {};
            this.destroy = vi.fn();
            this.setData = vi.fn(() => Promise.resolve());
            this.setPage = vi.fn(() => Promise.resolve());
            this.setFilter = vi.fn();
            this.columns = new Map();
            this.getColumn = vi.fn((field) => this.columns.get(field));
            this.getPageSize = vi.fn(() => 25);
            this.getSorters = vi.fn(() => []);
            this.getFilters = vi.fn(() => []);
            this.getColumns = vi.fn(() => []);
            this.blockRedraw = vi.fn();
            this.restoreRedraw = vi.fn();
            this.on = vi.fn((event, handler) => {
                this.handlers[event] = handler;
            });
            tables.push(this);
        }
    },
}));

import {
    createPetakGrid,
    destroyDisconnectedPetak,
    initializePetak,
    livewireTransport,
    localTransport,
    refreshPetak,
    stateStorage,
    structurePetakPaginator,
} from '../../resources/js/petak.js';

describe('Petak transports and lifecycle', () => {
    beforeEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
        tables.length = 0;
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

    it('reloads matching grids and destroys removed renderer instances', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="grid-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="grid-config" type="application/json">
                {
                    "version":"1",
                    "name":"users",
                    "mode":"remote",
                    "endpoint":"/users",
                    "columns":[],
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        const element = document.querySelector('[data-petak-grid]');
        const instance = createPetakGrid(element, {
            transport: {
                load: vi.fn(),
                destroy: vi.fn(),
            },
        });
        expect(createPetakGrid(element)).toBe(instance);

        refreshPetak('other');
        expect(tables[0].setData).not.toHaveBeenCalled();

        refreshPetak('users');
        expect(tables[0].setData).toHaveBeenCalledOnce();

        element.remove();
        destroyDisconnectedPetak();
        expect(tables[0].destroy).toHaveBeenCalledOnce();
    });

    it('does not mutate renderer opacity or wrapper height during table lifecycle', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="stable-render-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="stable-render-config" type="application/json">
                {
                    "version":"1",
                    "name":"users",
                    "mode":"remote",
                    "endpoint":"/users",
                    "columns":[],
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        const petakEl = document.querySelector('[data-petak-grid]');
        const renderer = document.querySelector('[data-petak-renderer]');
        createPetakGrid(petakEl, {
            transport: { load: vi.fn() },
        });

        petakEl.getBoundingClientRect = () => ({ height: 360 });
        tables[0].handlers.tableBuilt();
        tables[0].handlers.renderComplete();

        expect(renderer.style.opacity).toBe('');
        expect(petakEl.style.minHeight).toBe('');
    });

    it('initializes the same renderer only once', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="local-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="local-config" type="application/json">
                {
                    "version":"1",
                    "name":"local",
                    "mode":"local",
                    "columns":[],
                    "initialResult":{"data":[]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        initializePetak(document);
        initializePetak(document);

        expect(tables).toHaveLength(1);
    });

    it('passes remote preloaded results and responsive layout to Tabulator', async () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="preload-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="preload-config" type="application/json">
                {
                    "version":"1",
                    "name":"preloaded",
                    "mode":"remote",
                    "endpoint":"/users/data",
                    "columns":[
                        {"key":"name","label":"Name"},
                        {"key":"email","label":"Email","responsive_priority":2,"pin":"right"}
                    ],
                    "initialResult":{
                        "data":[{"name":"Ada","email":"ada@example.com"}],
                        "meta":{"pagination":{"last_page":3,"total":51}}
                    },
                    "responsive":{"layout":"collapse","collapse_start_open":false},
                    "renderer_options":{"tabulator":{"layout":"fitDataFill"}},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'), {
            transport: { load: vi.fn() },
        });

        // Remote mode with SSR: initial data must be served via ajaxRequestFunc, not tableOptions.data
        expect(tables[0].options.data).toBeUndefined();
        expect(tables[0].options.ajaxURL).toBe('/users/data');
        expect(tables[0].options.layout).toBe('fitDataFill');
        expect(tables[0].options.responsiveLayout).toBe('collapse');
        expect(tables[0].options.responsiveLayoutCollapseStartOpen).toBe(false);
        expect(tables[0].options.rowHeader).toMatchObject({
            formatter: 'responsiveCollapse',
            width: 40,
            headerSort: false,
            frozen: true,
        });
        expect(tables[0].options.columns[1].field).toBe('email');
        expect(tables[0].options.columns[1].responsive).toBe(2);
        expect(tables[0].options.columns[1].minWidth).toBe(100);
        expect(tables[0].options.columns[1].frozen).toBe(true);
        // right-pinned column must be physically last in the array
        expect(tables[0].options.columns).toHaveLength(2);

        // SSR data is returned by ajaxRequestFunc on first invocation
        await expect(tables[0].options.ajaxRequestFunc(null, null, {})).resolves.toMatchObject({
            data: [{ name: 'Ada', email: 'ada@example.com' }],
            last_page: 3,
            last_row: 51,
        });
    });

    it('lets Tabulator apply responsive defaults for collapse columns without explicit priority', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="collapse-default-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="collapse-default-config" type="application/json">
                {
                    "version":"1",
                    "name":"collapse-default",
                    "mode":"local",
                    "columns":[
                        {"key":"first","label":"First","responsive_priority":0},
                        {"key":"second","label":"Second","responsive_priority":0}
                    ],
                    "initialResult":{"data":[{"first":"A","second":"B"}]},
                    "responsive":{"layout":"collapse","collapse_start_open":false},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        expect(tables[0].options.rowHeader.formatter).toBe('responsiveCollapse');
        expect(tables[0].options.columns[0]).not.toHaveProperty('responsive');
        expect(tables[0].options.columns[1]).not.toHaveProperty('responsive');
    });

    it('uses Tabulator column defaults for plain grid column widths', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="plain-width-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="plain-width-config" type="application/json">
                {
                    "version":"1",
                    "name":"plain-width",
                    "mode":"local",
                    "columns":[
                        {"key":"first","label":"First"},
                        {"key":"second","label":"Second"},
                        {"key":"third","label":"Third"}
                    ],
                    "initialResult":{"data":[
                        {"first":"A","second":"Short","third":"A much longer value"},
                        {"first":"B","second":"A much much longer value","third":"Tiny"}
                    ]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        expect(tables[0].options.layout).toBe('fitColumns');
        expect(tables[0].options.columnDefaults).toMatchObject({
            minWidth: 80,
            widthGrow: 1,
            widthShrink: 1,
        });
        expect(tables[0].options.columns).toHaveLength(3);
        expect(tables[0].options.columns.every((column) => !Object.hasOwn(column, 'minWidth'))).toBe(true);
        expect(tables[0].options.columns.every((column) => !Object.hasOwn(column, 'widthGrow'))).toBe(true);
        expect(tables[0].options.columns.every((column) => !Object.hasOwn(column, 'formatter'))).toBe(true);
    });

    it('enables tristate sorting on sortable Tabulator columns only', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="tristate-sort-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="tristate-sort-config" type="application/json">
                {
                    "version":"1",
                    "name":"tristate-sort",
                    "mode":"local",
                    "columns":[
                        {"key":"name","label":"Name","sortable":true},
                        {"key":"email","label":"Email","sortable":false}
                    ],
                    "initialResult":{"data":[{"name":"Ada","email":"ada@example.com"}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        expect(tables[0].options.headerSortTristate).toBeUndefined();
        expect(tables[0].options.columns[0].headerSortTristate).toBe(true);
        expect(tables[0].options.columns[1]).not.toHaveProperty('headerSortTristate');
    });

    it('falls back to fitColumns for invalid Tabulator layout config', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="invalid-layout-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="invalid-layout-config" type="application/json">
                {
                    "version":"1",
                    "name":"invalid-layout",
                    "mode":"local",
                    "columns":[{"key":"name","label":"Name"}],
                    "initialResult":{"data":[{"name":"Ada"}]},
                    "renderer_options":{"tabulator":{"layout":"fitDataTable"}},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        expect(tables[0].options.layout).toBe('fitColumns');
    });

    it('versions and restores state from local storage', () => {
        const config = {
            state: {
                key: 'users',
                store: 'local-storage',
                version: 3,
            },
        };

        stateStorage(config).save({
            filters: [{ field: 'active', value: true }],
        });

        expect(stateStorage(config).load()).toEqual({
            filters: [{ field: 'active', value: true }],
        });
        expect(window.localStorage.getItem('petak:users:v2')).toBeNull();
    });

    it('does not persist table state before Tabulator is built', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="state-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="state-config" type="application/json">
                {
                    "version":"1",
                    "name":"state",
                    "mode":"local",
                    "state":{"key":"state","store":"local-storage","version":1},
                    "columns":[{"key":"id","label":"ID","visible":true}],
                    "initialResult":{"data":[{"id":1}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));
        tables[0].handlers.dataSorted();

        expect(tables[0].getPageSize).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('petak:state:v1')).toBeNull();

        tables[0].handlers.tableBuilt();
        tables[0].handlers.dataSorted();

        expect(tables[0].getPageSize).toHaveBeenCalledOnce();
        expect(JSON.parse(window.localStorage.getItem('petak:state:v1')).pageSize).toBe(25);
    });

    it('persists only serializable sort and filter state', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="serial-state-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="serial-state-config" type="application/json">
                {
                    "version":"1",
                    "name":"serial-state",
                    "mode":"local",
                    "state":{"key":"serial-state","store":"local-storage","version":1},
                    "columns":[
                        {"key":"name","label":"Name","visible":true},
                        {"key":"email","label":"Email","visible":true}
                    ],
                    "initialResult":{"data":[{"name":"Ada","email":"ada@example.com"}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        const circularColumn = {};
        circularColumn.table = { column: circularColumn };
        createPetakGrid(document.querySelector('[data-petak-grid]'));
        tables[0].getSorters.mockReturnValue([
            { column: circularColumn, field: 'name', dir: 'asc' },
        ]);
        tables[0].getFilters.mockReturnValue([
            { field: 'email', type: 'like', value: 'ada' },
        ]);

        tables[0].handlers.tableBuilt();
        expect(() => tables[0].handlers.dataSorted()).not.toThrow();

        const state = JSON.parse(window.localStorage.getItem('petak:serial-state:v1'));
        expect(state.sort).toEqual([{ field: 'name', dir: 'asc' }]);
        expect(state.filters).toEqual([{ field: 'email', type: 'like', value: 'ada' }]);
        expect(state.sort[0]).not.toHaveProperty('column');
    });

    it('restores persisted search, sort, and filters on initialization', () => {
        window.localStorage.setItem('petak:state:v1', JSON.stringify({
            pageSize: 50,
            sort: [{ field: 'name', dir: 'asc' }],
            filters: [{ field: 'active', type: '=', value: true }],
            columns: {
                order: ['name', 'active'],
                visibility: { name: true, active: false },
            },
            search: 'ada',
        }));
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="state-restore-config">
                <input data-petak-search>
                <input type="checkbox" value="active" data-petak-column checked>
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="state-restore-config" type="application/json">
                {
                    "version":"1",
                    "name":"state",
                    "mode":"local",
                    "state":{"key":"state","store":"local-storage","version":1},
                    "columns":[
                        {"key":"name","label":"Name","searchable":true,"visible":true},
                        {"key":"active","label":"Active","visible":true}
                    ],
                    "initialResult":{"data":[{"name":"Ada","active":true},{"name":"Bob","active":false}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25,50]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        expect(document.querySelector('[data-petak-search]').value).toBe('ada');
        expect(document.querySelector('[data-petak-column]').checked).toBe(false);
        expect(tables[0].options.paginationSize).toBe(50);
        expect(tables[0].options.initialSort).toEqual([{ field: 'name', dir: 'asc' }]);
        expect(tables[0].options.initialFilter).toEqual([{ field: 'active', type: '=', value: true }]);

        tables[0].handlers.tableBuilt();

        expect(tables[0].setFilter).toHaveBeenCalledOnce();
        expect(tables[0].setFilter.mock.calls[0][0]({ name: 'Ada' })).toBe(true);
        expect(tables[0].setFilter.mock.calls[0][0]({ name: 'Bob' })).toBe(false);
    });

    it('resets remote search to the first page through Tabulator pagination', () => {
        vi.useFakeTimers();
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="remote-search-config">
                <input data-petak-search>
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="remote-search-config" type="application/json">
                {
                    "version":"1",
                    "name":"remote-search",
                    "mode":"remote",
                    "endpoint":"/users",
                    "columns":[{"key":"name","label":"Name","searchable":true}],
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'), {
            transport: { load: vi.fn() },
        });

        const search = document.querySelector('[data-petak-search]');
        search.value = 'ada';
        search.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(300);

        expect(tables[0].setPage).toHaveBeenCalledWith(1);
        expect(tables[0].setData).not.toHaveBeenCalled();
    });

    it('uses configured row keys for inline edits and restores failed edits', async () => {
        global.fetch = vi.fn(async () => ({
            ok: false,
            status: 422,
            json: async () => ({ message: 'Rejected' }),
        }));
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="row-key-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="row-key-config" type="application/json">
                {
                    "version":"1",
                    "name":"rows",
                    "mode":"local",
                    "endpoint":"/rows",
                    "row_key":"uuid",
                    "columns":[{"key":"name","label":"Name","editable":true}],
                    "initialResult":{"data":[{"uuid":"abc","name":"Ada"}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        const restoreOldValue = vi.fn();
        await tables[0].handlers.cellEdited({
            getRow: () => ({ getData: () => ({ uuid: 'abc', name: 'Ada' }) }),
            getField: () => 'name',
            getValue: () => 'Updated',
            restoreOldValue,
        });

        const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(payload.petak_action.key).toBe('abc');
        expect(restoreOldValue).toHaveBeenCalledOnce();
        expect(document.querySelector('[data-petak-status]').textContent).toBe('Petak action failed (422).');
    });

    it('separates page-size controls from the pagination button group', () => {
        document.body.innerHTML = `
            <div id="renderer">
                <span class="tabulator-paginator">
                    <label>Page Size</label>
                    <select class="tabulator-page-size"><option>25</option></select>
                    <button class="tabulator-page" data-page="first">First</button>
                    <button class="tabulator-page" data-page="prev">Prev</button>
                    <span class="tabulator-pages"><button class="tabulator-page">1</button></span>
                    <button class="tabulator-page" data-page="next">Next</button>
                    <button class="tabulator-page" data-page="last">Last</button>
                </span>
            </div>
        `;

        const renderer = document.getElementById('renderer');
        structurePetakPaginator(renderer);
        structurePetakPaginator(renderer);

        expect(renderer.querySelectorAll('.petak__page-size-control')).toHaveLength(1);
        expect(renderer.querySelectorAll('.petak__page-navigation')).toHaveLength(1);
        expect(renderer.querySelector('.petak__page-size-control .tabulator-page-size')).not.toBeNull();
        expect(
            [...renderer.querySelector('.petak__page-navigation').children]
                .map((element) => element.dataset.page ?? element.className),
        ).toEqual(['first', 'prev', 'tabulator-pages', 'next', 'last']);

        const paginator = renderer.querySelector('.tabulator-paginator');
        const next = renderer.querySelector('[data-page="next"]');
        paginator.appendChild(next);
        structurePetakPaginator(renderer);

        expect(next.parentElement).toBe(renderer.querySelector('.petak__page-navigation'));
    });

    it('repairs paginator structure after a Tabulator render', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="render-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="render-config" type="application/json">
                {
                    "version":"1",
                    "name":"render",
                    "mode":"local",
                    "columns":[],
                    "initialResult":{"data":[]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        const element = document.querySelector('[data-petak-grid]');
        createPetakGrid(element);
        const renderer = element.querySelector('[data-petak-renderer]');

        renderer.innerHTML = `
            <span class="tabulator-paginator">
                <select class="tabulator-page-size"><option>25</option></select>
                <button class="tabulator-page" data-page="first">First</button>
                <span class="tabulator-pages"><button class="tabulator-page">1</button></span>
                <button class="tabulator-page" data-page="last">Last</button>
            </span>
        `;
        tables[0].handlers.renderComplete();

        expect(renderer.querySelector('.petak__page-size-control')).not.toBeNull();
        expect(renderer.querySelector('.petak__page-navigation')).not.toBeNull();
        expect(tables[0].blockRedraw).not.toHaveBeenCalled();
    });

    it('maps compact columns to a stable Tabulator width policy', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="fit-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="fit-config" type="application/json">
                {
                    "version":"1",
                    "name":"fit",
                    "mode":"local",
                    "appearance":{"vertical_align":"middle"},
                    "columns":[
                        {"key":"id","label":"ID","align":"end","sizing":{"mode":"compact","width":null,"min_width":null,"max_width":null}},
                        {"key":"name","label":"Name","sizing":{"mode":"fluid","width":null,"min_width":null,"max_width":null}},
                        {"key":"action","label":"Action","align":"end","vertical_align":"bottom","sizing":{"mode":"compact","width":"12ch","min_width":72,"max_width":160}}
                    ],
                    "initialResult":{"data":[{"id":1,"name":"Ada"}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        tables[0].handlers.renderComplete();
        expect(tables[0].blockRedraw).not.toHaveBeenCalled();

        expect(tables[0].options.columns[0].hozAlign).toBe('right');
        expect(tables[0].options.columns[0].vertAlign).toBe('middle');
        expect(tables[0].options.columns[0].minWidth).toBe(56);
        expect(tables[0].options.columns[0].widthGrow).toBe(0);
        expect(tables[0].options.columns[0].widthShrink).toBe(0);
        expect(tables[0].options.columns[1].widthGrow).toBeUndefined();
        expect(tables[0].options.columns[2].hozAlign).toBe('right');
        expect(tables[0].options.columns[2].vertAlign).toBe('bottom');
        expect(tables[0].options.columns[2].width).toBe('12ch');
        expect(tables[0].options.columns[2].minWidth).toBe(72);
        expect(tables[0].options.columns[2].maxWidth).toBe(160);
        expect(tables[0].options.columns[2].widthGrow).toBe(0);
        expect(tables[0].options.paginationCounter(25, 1, 1, 57)).toBe('Showing 1 to 25 of 57 entries');
        expect(tables[0].options.paginationCounter(25, 0, 1, 0)).toBe('Showing 0 to 0 of 0 entries');
        expect(tables[0].options.paginationCounter(25, 1, 1, 1)).toBe('Showing 1 to 1 of 1 entry');
    });

    it('maps filter metadata into Tabulator header controls', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="filter-ui-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="filter-ui-config" type="application/json">
                {
                    "version":"1",
                    "name":"filter-ui",
                    "mode":"local",
                    "columns":[
                        {
                            "key":"status",
                            "label":"Status",
                            "filter":{
                                "type":"select",
                                "component":"select",
                                "operator":"equals",
                                "options":{"draft":"Draft","paid":"Paid"}
                            }
                        },
                        {
                            "key":"score",
                            "label":"Score",
                            "filter":{
                                "type":"number",
                                "component":"input",
                                "input_type":"number",
                                "operator":"equals"
                            }
                        },
                        {
                            "key":"created_at",
                            "label":"Created",
                            "filter":{
                                "type":"date",
                                "component":"input",
                                "input_type":"date",
                                "operator":"equals"
                            }
                        }
                    ],
                    "initialResult":{"data":[]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        expect(tables[0].options.columns[0].headerFilter).toBe('list');
        expect(tables[0].options.columns[0].headerFilterParams.values).toEqual({
            '': '',
            draft: 'Draft',
            paid: 'Paid',
        });
        expect(tables[0].options.columns[1].headerFilterParams.elementAttributes.type).toBe('number');
        expect(tables[0].options.columns[2].headerFilterParams.elementAttributes.type).toBe('date');
    });

    it('wraps trusted html cell content so user markup keeps its own layout', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="html-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="html-config" type="application/json">
                {
                    "version":"1",
                    "name":"html",
                    "mode":"local",
                    "columns":[
                        {"key":"action","label":"Action","trusted_html":true,"vertical_align":"middle"}
                    ],
                    "initialResult":{"data":[{"action":"<a class='btn'>Edit</a> <a class='btn'>Delete</a>"}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        const wrapper = tables[0].options.columns[0].formatter({
            getValue: () => "<a class='btn'>Edit</a> <a class='btn'>Delete</a>",
        });

        expect(wrapper).toBeInstanceOf(HTMLElement);
        expect(wrapper.className).toBe('petak__cell-content');
        expect(wrapper.querySelectorAll('.btn')).toHaveLength(2);
        expect(wrapper.innerHTML).toContain('</a> <a');
    });

    it('does not measure compact columns after remote table build', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="initial-fit-config">
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="initial-fit-config" type="application/json">
                {
                    "version":"1",
                    "name":"initial-fit",
                    "mode":"remote",
                    "endpoint":"/users",
                    "columns":[
                        {"key":"id","label":"ID","sizing":{"mode":"compact","width":null,"min_width":null,"max_width":null}},
                        {"key":"action","label":"Action","sizing":{"mode":"compact","width":null,"min_width":null,"max_width":null}}
                    ],
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'), {
            transport: { load: vi.fn() },
        });

        const idDefinition = {};
        const actionDefinition = {};
        const idColumn = {
            setWidth: vi.fn(),
            isVisible: () => true,
            getWidth: () => 48,
            getDefinition: () => idDefinition,
        };
        const actionColumn = {
            setWidth: vi.fn(),
            isVisible: () => true,
            getWidth: () => 96,
            getDefinition: () => actionDefinition,
        };
        tables[0].columns.set('id', idColumn);
        tables[0].columns.set('action', actionColumn);
        tables[0].handlers.tableBuilt();

        expect(idColumn.setWidth).not.toHaveBeenCalled();
        expect(actionColumn.setWidth).not.toHaveBeenCalled();
        expect(idDefinition.width).toBeUndefined();
        expect(actionDefinition.width).toBeUndefined();
        expect(tables[0].blockRedraw).not.toHaveBeenCalled();
        expect(tables[0].restoreRedraw).not.toHaveBeenCalled();
        expect(tables[0].options.columns[0].widthGrow).toBe(0);
        expect(tables[0].options.columns[1].widthShrink).toBe(0);
    });

    it('uses a real button for the columns menu and closes it predictably', () => {
        document.body.innerHTML = `
            <div data-petak-grid data-petak-config="columns-config">
                <div class="petak__columns">
                    <button class="petak__columns-toggle" type="button" aria-expanded="false" data-petak-columns-toggle>
                        <span>Columns</span>
                        <span class="petak__columns-caret" aria-hidden="true"></span>
                    </button>
                    <div class="petak__columns-menu" hidden data-petak-columns-menu>
                        <label><input type="checkbox" value="id" data-petak-column checked> ID</label>
                    </div>
                </div>
                <div data-petak-renderer></div>
                <div data-petak-status></div>
            </div>
            <script id="columns-config" type="application/json">
                {
                    "version":"1",
                    "name":"columns",
                    "mode":"local",
                    "state":{"key":"columns","store":"local-storage","version":1},
                    "columns":[{"key":"id","label":"ID","visible":true}],
                    "initialResult":{"data":[{"id":1}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        const toggle = document.querySelector('[data-petak-columns-toggle]');
        const menu = document.querySelector('[data-petak-columns-menu]');

        expect(toggle.tagName).toBe('BUTTON');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(menu.hidden).toBe(true);

        toggle.click();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(menu.hidden).toBe(false);

        document.body.click();

        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(menu.hidden).toBe(true);
    });
});
