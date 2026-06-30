const filters = new Map();
const cells = new Map();

export function registerFilter(name, plugin) {
    filters.set(name, plugin);
}

export function registerCell(name, plugin) {
    cells.set(name, plugin);
}

export function filterPlugin(name) {
    return filters.get(name) ?? filters.get('input');
}

export function cellPlugin(name) {
    return cells.get(name) ?? cells.get('text');
}

export function createPluginScope() {
    const cleanups = [];

    return {
        add(cleanup) {
            if (typeof cleanup === 'function') {
                cleanups.push(cleanup);
            }
        },

        destroy() {
            while (cleanups.length > 0) {
                cleanups.pop()?.();
            }
        },
    };
}

registerCell('text', {
    render({ value }) {
        return document.createTextNode(value ?? '');
    },
});

registerCell('html', {
    render({ value }) {
        const span = document.createElement('span');
        span.className = 'petak__cell-content';
        span.innerHTML = value ?? '';

        return span;
    },
});

registerFilter('input', {
    mount(el, { column, operator, value, setValue }) {
        if (['is_empty', 'is_not_empty'].includes(operator)) {
            return;
        }

        if (['between', 'not_between'].includes(operator)) {
            const from = document.createElement('input');
            const to = document.createElement('input');
            const update = () => setValue({
                from: from.value,
                to: to.value,
            });

            from.type = column.filter?.input_type ?? 'text';
            to.type = column.filter?.input_type ?? 'text';
            from.value = value?.from ?? '';
            to.value = value?.to ?? '';
            from.placeholder = 'From';
            to.placeholder = 'To';
            from.dataset.petakFilterInput = column.key;
            to.dataset.petakFilterInput = column.key;
            from.addEventListener('input', update);
            to.addEventListener('input', update);
            el.append(from, to);

            return;
        }

        const input = document.createElement('input');
        input.type = column.filter?.input_type ?? 'text';
        input.value = value ?? '';
        input.placeholder = column.filter?.placeholder ?? '';
        input.dataset.petakFilterInput = column.key;
        input.addEventListener('input', () => setValue(input.value));
        el.append(input);
    },
});

registerFilter('select', {
    mount(el, { column, value, setValue }) {
        const select = document.createElement('select');
        select.dataset.petakFilterInput = column.key;

        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '';
        select.append(empty);

        Object.entries(column.filter?.options ?? {}).forEach(([optionValue, label]) => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = label;
            option.selected = `${value ?? ''}` === `${optionValue}`;
            select.append(option);
        });

        select.addEventListener('change', () => setValue(select.value));
        el.append(select);
    },
});
