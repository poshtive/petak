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

    it('passes remote preloaded results and responsive layout to Tabulator', () => {
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
                    "columns":[{"key":"email","label":"Email","responsive_priority":2,"pin":"right"}],
                    "initialResult":{
                        "data":[{"email":"ada@example.com"}],
                        "meta":{"pagination":{"last_page":3,"total":51}}
                    },
                    "responsive":{"layout":"collapse","collapse_start_open":false},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'), {
            transport: { load: vi.fn() },
        });

        expect(tables[0].options.data).toEqual({
            data: [{ email: 'ada@example.com' }],
            last_page: 3,
            last_row: 51,
        });
        expect(tables[0].options.ajaxURL).toBe('/users/data');
        expect(tables[0].options.responsiveLayout).toBe('collapse');
        expect(tables[0].options.responsiveLayoutCollapseStartOpen).toBe(false);
        expect(tables[0].options.columns[0].responsive).toBe(2);
        expect(tables[0].options.columns[0].frozen).toBe(true);
        expect(tables[0].options.columns[0].frozenPosition).toBe('right');
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

    it('fits configured columns after data is rendered', () => {
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
                        {"key":"id","label":"ID","align":"end","fit_content":true},
                        {"key":"name","label":"Name","fit_content":false},
                        {"key":"action","label":"Action","align":"end","vertical_align":"bottom","fit_content":true}
                    ],
                    "initialResult":{"data":[{"id":1,"name":"Ada"}]},
                    "pagination":{"default_page_size":25,"page_sizes":[25]}
                }
            </script>
        `;

        createPetakGrid(document.querySelector('[data-petak-grid]'));

        const makeColumn = () => {
            const definition = {};

            return {
                setWidth: vi.fn(),
                isVisible: () => true,
                getWidth: () => 72,
                getDefinition: () => definition,
                definition,
            };
        };
        const idColumn = makeColumn();
        const nameColumn = makeColumn();
        const actionColumn = makeColumn();
        tables[0].columns.set('id', idColumn);
        tables[0].columns.set('name', nameColumn);
        tables[0].columns.set('action', actionColumn);
        tables[0].handlers.tableBuilt();
        idColumn.setWidth.mockClear();
        nameColumn.setWidth.mockClear();
        actionColumn.setWidth.mockClear();
        tables[0].blockRedraw.mockClear();
        tables[0].restoreRedraw.mockClear();
        tables[0].handlers.dataProcessed();
        tables[0].handlers.renderComplete();

        expect(idColumn.setWidth).toHaveBeenCalledWith(true);
        expect(nameColumn.setWidth).not.toHaveBeenCalled();
        expect(actionColumn.setWidth).toHaveBeenCalledWith(true);
        expect(idColumn.definition.width).toBe(72);
        expect(actionColumn.definition.width).toBe(72);
        expect(tables[0].blockRedraw).toHaveBeenCalledOnce();
        expect(tables[0].restoreRedraw).toHaveBeenCalledOnce();
        expect(tables[0].options.columns[0].hozAlign).toBe('right');
        expect(tables[0].options.columns[0].vertAlign).toBe('middle');
        expect(tables[0].options.columns[2].hozAlign).toBe('right');
        expect(tables[0].options.columns[2].vertAlign).toBe('bottom');
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

    it('fits initial columns when the table is built', () => {
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
                        {"key":"id","label":"ID","fit_content":true},
                        {"key":"action","label":"Action","fit_content":true}
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

        expect(idColumn.setWidth).toHaveBeenCalledWith(true);
        expect(actionColumn.setWidth).toHaveBeenCalledWith(true);
        expect(idDefinition.width).toBe(48);
        expect(actionDefinition.width).toBe(96);
        expect(tables[0].blockRedraw).toHaveBeenCalledOnce();
        expect(tables[0].restoreRedraw).toHaveBeenCalledOnce();
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
