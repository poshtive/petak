export function structurePetakPaginator(root) {
    const paginator = root.querySelector('.tabulator-paginator');

    if (!paginator) {
        return;
    }

    const label = paginator.querySelector('label');
    const pageSize = paginator.querySelector('.tabulator-page-size');
    const navigationItems = [
        paginator.querySelector('.tabulator-page[data-page="first"]'),
        paginator.querySelector('.tabulator-page[data-page="prev"]'),
        paginator.querySelector('.tabulator-pages'),
        paginator.querySelector('.tabulator-page[data-page="next"]'),
        paginator.querySelector('.tabulator-page[data-page="last"]'),
    ].filter(Boolean);
    let sizeControl = paginator.querySelector(':scope > .petak__page-size-control');
    let navigation = paginator.querySelector(':scope > .petak__page-navigation');

    if ((label || pageSize) && !sizeControl) {
        sizeControl = document.createElement('span');
        sizeControl.className = 'petak__page-size-control';
        paginator.appendChild(sizeControl);
    }

    if (sizeControl) {
        if (label) sizeControl.appendChild(label);
        if (pageSize) sizeControl.appendChild(pageSize);
    }

    if (navigationItems.length && !navigation) {
        navigation = document.createElement('span');
        navigation.className = 'petak__page-navigation';
        navigation.setAttribute('role', 'group');
        navigation.setAttribute('aria-label', 'Pagination');
        paginator.appendChild(navigation);
    }

    if (navigation) {
        navigationItems.forEach((item) => navigation.appendChild(item));
    }
}
