import { executePetakAction } from '../../core/actions.js';
import { configuredColumnWidth, controlColumnWidthForDensity, hasBulkActions, visibleColumns } from './layout.js';
import { el } from './dom.js';
import { cellPlugin, filterPlugin } from './plugins.js';
import { resultMeta } from './request.js';

function hasFilterRow(columns) {
    return columns.some((column) => Boolean(column.filter));
}

function hasDetailsControl(collapsedColumns) {
    return collapsedColumns.length > 0;
}

function hasSelectionControl(config) {
    return hasBulkActions(config);
}

function visibleRowKeys(config, result) {
    return (result?.data ?? []).map((row, index) => `${rowKey(row, config, index)}`);
}

function selectionState(config, state, result) {
    const keys = visibleRowKeys(config, result);
    const selected = keys.filter((key) => state.selected.has(key)).length;

    return {
        selected,
        total: keys.length,
        all: keys.length > 0 && selected === keys.length,
        partial: selected > 0 && selected < keys.length,
    };
}

function columnStyle(column) {
    const sizing = column.sizing ?? {};
    const styles = [];

    if (sizing.width !== null && sizing.width !== undefined) {
        styles.push(`width: ${Number.isInteger(sizing.width) ? `${sizing.width}px` : sizing.width}`);
    }

    if (sizing.min_width !== null && sizing.min_width !== undefined) {
        styles.push(`min-width: ${sizing.min_width}px`);
    }

    if (sizing.max_width !== null && sizing.max_width !== undefined) {
        styles.push(`max-width: ${sizing.max_width}px`);
    }

    return styles.join('; ');
}

function tableMinWidth(columns, detailsControl, selectionControl, density) {
    const controlWidth = controlColumnWidthForDensity(density)
        * ((detailsControl ? 1 : 0) + (selectionControl ? 1 : 0));
    const columnsWidth = columns.reduce((total, column) => total + configuredColumnWidth(column, 0), 0);

    return `${controlWidth + columnsWidth}px`;
}

function rowKey(row, config, index) {
    return row?.[config.row_key ?? 'id'] ?? index;
}

function sortDirection(state, column) {
    return state.sort.find((sort) => sort.field === column.key)?.dir ?? null;
}

function nextSort(direction) {
    if (!direction) {
        return 'asc';
    }

    if (direction === 'asc') {
        return 'desc';
    }

    return null;
}

function sortableHeaderAttributes(column, state) {
    const direction = sortDirection(state, column);

    return {
        class: 'petak-native__sortable-header',
        dataset: { petakSort: column.key },
        tabindex: '0',
        role: 'button',
        'aria-sort': direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none',
        'aria-label': `Sort by ${column.label}`,
    };
}

function renderSortLabel(column, state) {
    const direction = sortDirection(state, column);
    const label = el('span', { class: 'petak-native__sort' });

    label.append(el('span', { class: 'petak-native__sort-label', text: column.label }));
    label.append(el('span', {
        class: 'petak-native__sort-indicator',
        dataset: { petakSortDirection: direction ?? 'none' },
        'aria-hidden': 'true',
    }));

    return label;
}

function renderFilterCell(column, state, plugins) {
    const th = cell('th', column, 'petak-native__filter-cell');

    if (!column.filter) {
        return th;
    }

    const filterState = state.filters[column.key] ?? {
        operator: column.filter.operator,
        value: '',
    };
    const plugin = filterPlugin(column.filter.component);
    const operators = column.filter.operators ?? [];
    const host = el('div', {
        class: operators.length > 1 ? 'petak-native__filter' : 'petak-native__filter petak-native__filter--single',
        dataset: { petakFilterHost: column.key },
    });
    const valueHost = el('div', { class: 'petak-native__filter-value' });

    th.append(host);

    if (operators.length > 1) {
        const operator = el('select', {
            class: 'petak-native__filter-operator',
            dataset: { petakFilterOperator: column.key },
            'aria-label': `${column.label} filter operator`,
        });

        operators.forEach((candidate) => {
            operator.append(el('option', {
                value: candidate,
                text: operatorLabel(candidate),
                selected: candidate === filterState.operator,
            }));
        });

        operator.addEventListener('change', () => {
            host.dispatchEvent(new CustomEvent('petak:filter-change', {
                bubbles: true,
                detail: {
                    field: column.key,
                    operator: operator.value,
                    value: filterState.value,
                },
            }));
        });
        host.append(operator);
    }

    host.append(valueHost);

    plugins.add(plugin?.mount?.(valueHost, {
        column,
        value: filterState.value,
        operator: filterState.operator,
        setValue(value) {
            host.dispatchEvent(new CustomEvent('petak:filter-change', {
                bubbles: true,
                detail: {
                    field: column.key,
                    operator: filterState.operator,
                    value,
                },
            }));
        },
    }));

    return th;
}

function operatorLabel(operator) {
    return {
        contains: 'Contains',
        not_contains: 'Not contains',
        starts_with: 'Starts with',
        ends_with: 'Ends with',
        equals: '=',
        not_equals: '!=',
        greater_than: '>',
        greater_or_equal: '>=',
        less_than: '<',
        less_or_equal: '<=',
        between: 'Between',
        not_between: 'Not between',
        in: 'In',
        not_in: 'Not in',
        is_empty: 'Empty',
        is_not_empty: 'Not empty',
    }[operator] ?? operator;
}

function cell(tag, column, className = '') {
    return el(tag, {
        class: className,
        style: columnStyle(column),
        dataset: {
            petakColumn: column.key,
            petakPin: column.pin ?? '',
        },
        'data-align': column.align,
        'data-vertical-align': column.vertical_align ?? 'middle',
        'data-sizing': column.sizing?.mode ?? 'fluid',
    });
}

function renderDataCell(column, row) {
    const td = cell('td', column);
    const plugin = cellPlugin(column.trusted_html ? 'html' : 'text');
    const content = el('div', { class: 'petak-native__cell-content' });

    content.append(plugin.render({
        column,
        row,
        value: row?.[column.key],
    }));
    td.append(content);

    return td;
}

function renderCollapsedRow(columns, row, key, colspan) {
    const tr = el('tr', {
        class: 'petak-native__details-row',
        dataset: { petakDetailsFor: key },
    });
    const td = el('td', {
        colspan,
    });
    const dl = el('dl', { class: 'petak-native__details' });

    columns.forEach((column) => {
        dl.append(el('dt', { text: column.label }));
        const dd = el('dd');
        dd.append(cellPlugin(column.trusted_html ? 'html' : 'text').render({
            column,
            row,
            value: row?.[column.key],
        }));
        dl.append(dd);
    });

    td.append(dl);
    tr.append(td);

    return tr;
}

function renderBody(config, state, result, layoutState) {
    const tbody = el('tbody');
    const columns = visibleColumns(config, state);
    const renderedColumns = columns.filter((column) => !layoutState.collapsed.has(column.key));
    const collapsedColumns = config.responsive?.layout === 'collapse'
        ? columns.filter((column) => layoutState.collapsed.has(column.key))
        : [];
    const detailsControl = hasDetailsControl(collapsedColumns);
    const selectionControl = hasSelectionControl(config);
    const rows = result?.data ?? [];

    if (rows.length === 0) {
        tbody.append(el('tr', {}, [
            el('td', {
                class: 'petak-native__empty',
                colspan: renderedColumns.length + (detailsControl ? 1 : 0) + (selectionControl ? 1 : 0),
                text: state.search || Object.values(state.filters).some((filter) => filter.value)
                    ? 'No results match current filters.'
                    : 'No entries found.',
            }),
        ]));

        return tbody;
    }

    rows.forEach((row, index) => {
        const key = `${rowKey(row, config, index)}`;
        const selected = state.selected.has(key);
        const detailsOpen = state.expanded.has(key)
            || (Boolean(config.responsive?.collapse_start_open) && !state.collapsedToggled.has(key));
        const tr = el('tr', {
            dataset: selected ? { petakRow: key, petakSelected: 'true' } : { petakRow: key },
        });

        if (detailsControl) {
            tr.append(el('td', {
                class: 'petak-native__control-cell petak-native__details-cell',
                dataset: { petakPin: 'left' },
            }, [
                el('button', {
                    type: 'button',
                    class: 'petak-native__icon-button petak-native__details-toggle',
                    dataset: { petakToggleDetails: key },
                    'aria-expanded': detailsOpen ? 'true' : 'false',
                    'aria-label': detailsOpen ? 'Hide row details' : 'Show row details',
                }, [
                    el('span', {
                        class: 'petak-native__toggle-icon',
                        'aria-hidden': 'true',
                        text: detailsOpen ? '-' : '+',
                    }),
                ]),
            ]));
        }

        if (selectionControl) {
            tr.append(el('td', {
                class: 'petak-native__control-cell petak-native__selection-cell',
                dataset: { petakPin: 'left' },
            }, [
                rowCheckbox(key, selected),
            ]));
        }

        renderedColumns.forEach((column) => tr.append(renderDataCell(column, row)));
        tbody.append(tr);

        if (detailsOpen && collapsedColumns.length > 0) {
            tbody.append(renderCollapsedRow(
                collapsedColumns,
                row,
                key,
                renderedColumns.length + (detailsControl ? 1 : 0) + (selectionControl ? 1 : 0),
            ));
        }
    });

    return tbody;
}

function renderPagination(config, state, result) {
    const meta = resultMeta(result);
    const total = meta.total ?? 0;
    const from = total > 0 ? meta.from ?? 1 : 0;
    const to = total > 0 ? meta.to ?? 0 : 0;
    const noun = total === 1 ? 'entry' : 'entries';
    const pagination = el('div', { class: 'petak__pagination petak-native__pagination' });
    const controls = el('div', { class: 'petak-native__page-controls' });
    const size = el('select', {
        class: 'petak-native__page-size',
        dataset: { petakPageSize: 'true' },
        'aria-label': 'Rows per page',
    });

    (config.pagination?.page_sizes ?? [10, 25, 50, 100]).forEach((pageSize) => {
        size.append(el('option', {
            value: pageSize,
            text: pageSize,
            selected: Number(pageSize) === Number(state.page.size),
        }));
    });

    controls.append(el('label', { class: 'petak-native__page-size-label' }, [
        el('span', { text: 'Rows' }),
        size,
    ]));
    renderPageButtons(meta).forEach((button) => controls.append(button));

    pagination.append(el('span', {
        class: 'petak__pagination-summary',
        text: `Showing ${from} to ${to} of ${total} ${noun}`,
    }));
    pagination.append(controls);

    return pagination;
}

function pageButton(page, label, meta, options = {}) {
    const current = Number(meta.page ?? 1);

    return el('button', {
        type: 'button',
        class: options.current ? 'petak-native__page-button is-active' : 'petak-native__page-button',
        dataset: page ? { petakPage: `${page}` } : {},
        disabled: options.disabled,
        'aria-label': options.ariaLabel ?? label,
        'aria-current': options.current ? 'page' : null,
        text: label,
    });
}

function renderPageButtons(meta) {
    const current = Number(meta.page ?? 1);
    const last = Number(meta.last_page ?? 1);
    const pages = new Set([1, last, current - 1, current, current + 1]);
    const buttons = [
        pageButton(1, 'First', meta, { disabled: current <= 1, ariaLabel: 'First page' }),
        pageButton(Math.max(1, current - 1), 'Prev', meta, { disabled: current <= 1, ariaLabel: 'Previous page' }),
    ];
    let previous = 0;

    [...pages]
        .filter((page) => page >= 1 && page <= last)
        .sort((left, right) => left - right)
        .forEach((page) => {
            if (previous && page - previous > 1) {
                buttons.push(el('span', {
                    class: 'petak-native__page-ellipsis',
                    text: '...',
                    'aria-hidden': 'true',
                }));
            }

            buttons.push(pageButton(page, `${page}`, meta, {
                current: page === current,
                ariaLabel: `Page ${page}`,
            }));
            previous = page;
        });

    buttons.push(pageButton(Math.min(last, current + 1), 'Next', meta, {
        disabled: current >= last,
        ariaLabel: 'Next page',
    }));
    buttons.push(pageButton(last, 'Last', meta, {
        disabled: current >= last,
        ariaLabel: 'Last page',
    }));

    return buttons;
}

export function renderNativeTable({ root, config, state, result, layoutState, plugins }) {
    plugins.destroy();

    const visible = visibleColumns(config, state);
    const columns = visible.filter((column) => !layoutState.collapsed.has(column.key));
    const collapsedColumns = config.responsive?.layout === 'collapse'
        ? visible.filter((column) => layoutState.collapsed.has(column.key))
        : [];
    const detailsControl = hasDetailsControl(collapsedColumns);
    const selectionControl = hasSelectionControl(config);
    const filterRow = hasFilterRow(columns);
    const fragment = document.createDocumentFragment();
    const table = el('table', {
        class: [
            'petak-native__table',
            config.appearance?.bordered ? 'is-bordered' : '',
            config.appearance?.striped ? 'is-striped' : '',
            config.appearance?.density ? `is-${config.appearance.density}` : '',
        ].filter(Boolean).join(' '),
        style: `--petak-native-table-min-width: ${tableMinWidth(
            columns,
            detailsControl,
            selectionControl,
            config.appearance?.density,
        )}`,
    });
    const tableScroll = el('div', {
        class: [
            'petak-native__table-scroll',
            config.appearance?.bordered ? 'is-bordered' : '',
        ].filter(Boolean).join(' '),
    });
    const colgroup = el('colgroup');
    const thead = el('thead');
    const header = el('tr');
    const filters = el('tr', { class: 'petak-native__filters-row' });

    if (detailsControl) {
        colgroup.append(el('col', { class: 'petak-native__control-col petak-native__details-col' }));
        header.append(el('th', {
            class: 'petak-native__control-cell petak-native__details-cell',
            dataset: { petakPin: 'left' },
        }));

        if (filterRow) {
            filters.append(el('th', {
                class: 'petak-native__control-cell petak-native__details-cell',
                dataset: { petakPin: 'left' },
            }));
        }
    }

    if (selectionControl) {
        colgroup.append(el('col', { class: 'petak-native__control-col petak-native__selection-col' }));
        header.append(el('th', {
            class: 'petak-native__control-cell petak-native__selection-cell',
            dataset: { petakPin: 'left' },
        }, [
            allRowsCheckbox(config, state, result),
        ]));

        if (filterRow) {
            filters.append(el('th', {
                class: 'petak-native__control-cell petak-native__selection-cell',
                dataset: { petakPin: 'left' },
            }));
        }
    }

    columns.forEach((column) => {
        colgroup.append(el('col', { style: columnStyle(column) }));
        const th = cell('th', column, column.sortable ? 'petak-native__sortable-header' : '');
        th.scope = 'col';

        if (column.sortable) {
            Object.entries(sortableHeaderAttributes(column, state)).forEach(([key, value]) => {
                if (key === 'dataset') {
                    Object.assign(th.dataset, value);
                } else {
                    th.setAttribute(key, value);
                }
            });
            th.append(renderSortLabel(column, state));
        } else {
            th.append(el('span', { class: 'petak-native__heading-label', text: column.label }));
        }

        header.append(th);
        if (filterRow) {
            filters.append(renderFilterCell(column, state, plugins));
        }
    });

    thead.append(header);
    if (filterRow) {
        thead.append(filters);
    }
    table.append(colgroup);
    table.append(thead);
    table.append(renderBody(config, state, result, layoutState));
    tableScroll.append(table);
    fragment.append(tableScroll);
    fragment.append(renderPagination(config, state, result));
    root.replaceChildren(fragment);
}

function rowCheckbox(key, checked) {
    const checkbox = el('input', {
        type: 'checkbox',
        class: 'petak-native__row-check',
        value: key,
        dataset: { petakSelectRow: key },
        'aria-label': 'Select row',
    });

    checkbox.checked = checked;

    return checkbox;
}

function allRowsCheckbox(config, state, result) {
    const checkbox = el('input', {
        type: 'checkbox',
        class: 'petak-native__all-check',
        dataset: { petakSelectAll: 'true' },
        'aria-label': 'Select all rows',
    });
    const selection = selectionState(config, state, result);

    checkbox.checked = selection.all;
    checkbox.indeterminate = selection.partial;
    checkbox.dataset.petakSelectionState = selection.all ? 'all' : selection.partial ? 'partial' : 'none';

    return checkbox;
}

export async function runExport(config, stateRequest, name) {
    const exportConfig = config.exports?.find((candidate) => candidate.name === name);
    const blob = await executePetakAction(config, {
        type: 'export',
        name,
        request: stateRequest,
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.name}.${exportConfig?.extension ?? name}`;
    link.click();
    URL.revokeObjectURL(link.href);
}
