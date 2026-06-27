import { tabulatorColumns } from './columns.js';

function paginationCounter(pageSize, currentRow, _currentPage, totalRows) {
    const from = totalRows > 0 ? currentRow : 0;
    const to = totalRows > 0 ? Math.min(currentRow + pageSize - 1, totalRows) : 0;
    const noun = totalRows === 1 ? 'entry' : 'entries';

    return `Showing ${from} to ${to} of ${totalRows} ${noun}`;
}

export function buildTabulatorOptions({ config, persistedState, remote, rowKey, dataAdapter }) {
    const options = {
        index: rowKey,
        columns: tabulatorColumns(config, persistedState),
        columnDefaults: {
            minWidth: 80,
            widthGrow: 1,
            widthShrink: 1,
        },
        layout: 'fitColumns',
        placeholder: 'No entries found.',
        pagination: true,
        paginationMode: remote ? 'remote' : 'local',
        paginationSize: persistedState?.pageSize ?? config.pagination.default_page_size,
        paginationSizeSelector: config.pagination.page_sizes,
        paginationCounter,
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
        ajaxLoader: true,
        ajaxLoaderLoading: `
            <div class="petak__loader" role="status">
                <span class="petak__loader-spinner" aria-hidden="true"></span>
                <span>Loading data...</span>
            </div>
        `,
        ajaxLoaderError: `
            <div class="petak__loader petak__loader--error" role="alert">
                Unable to load data.
            </div>
        `,
    };

    if (remote) {
        options.ajaxURL = config.endpoint;
        options.ajaxRequestFunc = dataAdapter.load;
    } else if (config.initialResult) {
        options.data = config.initialResult.data ?? [];
    }

    if (config.responsive?.layout) {
        options.responsiveLayout = config.responsive.layout;
        options.responsiveLayoutCollapseStartOpen = Boolean(config.responsive.collapse_start_open);

        if (config.responsive.layout === 'collapse') {
            options.rowHeader = {
                formatter: 'responsiveCollapse',
                width: 40,
                minWidth: 40,
                hozAlign: 'center',
                headerSort: false,
                resizable: false,
                frozen: true,
            };
        }
    }

    if (Array.isArray(persistedState?.sort) && persistedState.sort.length > 0) {
        options.initialSort = persistedState.sort;
    }

    if (Array.isArray(persistedState?.filters) && persistedState.filters.length > 0) {
        options.initialFilter = persistedState.filters;
    }

    return options;
}
