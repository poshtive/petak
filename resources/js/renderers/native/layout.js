function sameSet(left, right) {
    if (left.size !== right.size) {
        return false;
    }

    for (const item of left) {
        if (!right.has(item)) {
            return false;
        }
    }

    return true;
}

function responsiveCandidates(config, state) {
    return (config.columns ?? [])
        .filter((column) => state.columns.visibility[column.key] !== false)
        .filter((column) => !column.pin)
        .filter((column) => column.responsive_priority > 0)
        .sort((left, right) => right.responsive_priority - left.responsive_priority);
}

function visibleColumns(config, state) {
    return (config.columns ?? []).filter((column) => state.columns.visibility[column.key] !== false);
}

function hasBulkActions(config) {
    return (config.bulk_actions?.length ?? 0) > 0;
}

function tableWidth(root) {
    return root.querySelector('.petak-native__table')?.scrollWidth ?? 0;
}

function containerWidth(root) {
    return root.clientWidth || root.getBoundingClientRect().width || 0;
}

function headerCellWidth(root, key) {
    const escaped = window.CSS?.escape?.(key) ?? key.replace(/"/g, '\\"');
    const cell = root.querySelector(`thead [data-petak-column="${escaped}"]`);

    return cell?.getBoundingClientRect().width ?? 0;
}

export function configuredColumnWidth(column, available) {
    const sizing = column.sizing ?? {};
    const explicit = sizing.width;

    if (Number.isFinite(explicit)) {
        return Number(explicit);
    }

    if (typeof explicit === 'string') {
        const match = explicit.match(/^(\d+(?:\.\d+)?)(%|px|rem|em|ch|vw|vmin|vmax)$/);

        if (match) {
            const value = Number(match[1]);
            const unit = match[2];

            if (unit === '%') {
                return available > 0 ? (available * value) / 100 : 120;
            }

            if (unit === 'px') {
                return value;
            }

            if (unit === 'ch') {
                return value * 8;
            }

            if (['rem', 'em'].includes(unit)) {
                return value * 16;
            }
        }
    }

    if (Number.isFinite(sizing.min_width)) {
        return Number(sizing.min_width);
    }

    return sizing.mode === 'compact' ? 72 : 128;
}

function columnWidth(root, column, available) {
    const measured = headerCellWidth(root, column.key);

    if (measured > 0) {
        return measured;
    }

    return configuredColumnWidth(column, available);
}

function controlColumnWidthForDensity(density) {
    if (density === 'compact') {
        return 32;
    }

    if (density === 'spacious') {
        return 48;
    }

    return 40;
}

function controlColumnWidth(root, config) {
    const measured = root.querySelector('.petak-native__control-cell')?.getBoundingClientRect().width ?? 0;

    return measured > 0 ? measured : controlColumnWidthForDensity(config.appearance?.density);
}

function detailsControlColumnWidth(root, config) {
    const measured = root.querySelector('.petak-native__details-cell')?.getBoundingClientRect().width ?? 0;

    return measured > 0 ? measured : controlColumnWidthForDensity(config.appearance?.density);
}

export function createLayoutState() {
    return {
        collapsed: new Set(),
    };
}

export function nextCollapsedColumns({ root, config, state, current }) {
    if (!['collapse', 'hide'].includes(config.responsive?.layout)) {
        return current;
    }

    const available = containerWidth(root);
    const columns = visibleColumns(config, state);
    const widths = new Map(columns.map((column) => [column.key, columnWidth(root, column, available)]));
    const measuredWidth = tableWidth(root);
    const selectionWidth = hasBulkActions(config) ? controlColumnWidth(root, config) : 0;
    const configuredWidth = columns.reduce((total, column) => total + (widths.get(column.key) ?? 0), selectionWidth);
    let overflow = Math.max(measuredWidth, configuredWidth) - available;

    if (overflow <= 1) {
        return new Set();
    }

    const next = new Set();
    let detailControlAdded = false;

    for (const column of responsiveCandidates(config, state)) {
        next.add(column.key);
        overflow -= widths.get(column.key) ?? configuredColumnWidth(column, available);

        if (
            config.responsive?.layout === 'collapse'
            && !detailControlAdded
        ) {
            overflow += detailsControlColumnWidth(root, config);
            detailControlAdded = true;
        }

        if (overflow <= 1) {
            break;
        }
    }

    return next;
}

function rows(root) {
    return [...root.querySelectorAll('.petak-native__table tr')]
        .filter((row) => !row.classList.contains('petak-native__details-row'));
}

function resetSticky(root) {
    root.querySelectorAll('[data-petak-pin]').forEach((cell) => {
        cell.style.insetInlineStart = '';
        cell.style.insetInlineEnd = '';
        cell.classList.remove('petak-native__sticky', 'petak-native__sticky-left', 'petak-native__sticky-right');
    });
}

function totalPinnedWidth(root, side) {
    const firstRow = rows(root)[0];

    return [...(firstRow?.children ?? [])]
        .filter((cell) => cell.dataset.petakPin === side)
        .reduce((total, cell) => total + cell.getBoundingClientRect().width, 0);
}

export function applyStickyColumns({ root, config }) {
    resetSticky(root);

    const available = containerWidth(root);
    const sticky = config.renderer_options?.native?.sticky ?? {};
    const disableBelow = sticky.disable_below ?? 480;
    const maxRatio = sticky.max_frozen_width_ratio ?? 0.55;

    if (available <= disableBelow) {
        return;
    }

    const frozenWidth = totalPinnedWidth(root, 'left') + totalPinnedWidth(root, 'right');

    if (available > 0 && frozenWidth / available > maxRatio) {
        return;
    }

    rows(root).forEach((row) => {
        let left = 0;
        [...row.children].forEach((cell) => {
            if (cell.dataset.petakPin !== 'left') {
                return;
            }

            cell.style.insetInlineStart = `${left}px`;
            cell.classList.add('petak-native__sticky', 'petak-native__sticky-left');
            left += cell.getBoundingClientRect().width;
        });

        let right = 0;
        [...row.children].reverse().forEach((cell) => {
            if (cell.dataset.petakPin !== 'right') {
                return;
            }

            cell.style.insetInlineEnd = `${right}px`;
            cell.classList.add('petak-native__sticky', 'petak-native__sticky-right');
            right += cell.getBoundingClientRect().width;
        });
    });
}

export function layoutChanged(left, right) {
    return !sameSet(left.collapsed, right.collapsed);
}
