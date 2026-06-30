export function el(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
        if (value === false || value === null || value === undefined) {
            return;
        }

        if (key === 'class') {
            node.className = value;
        } else if (key === 'text') {
            node.textContent = value;
        } else if (key === 'dataset') {
            Object.assign(node.dataset, value);
        } else {
            node.setAttribute(key, value === true ? '' : value);
        }
    });

    children.forEach((child) => node.append(child));

    return node;
}

export function debounce(callback, delay = 250) {
    let timer;

    return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => callback(...args), delay);
    };
}
