export function bindColumnsMenu(element) {
    const toggle = element.querySelector('[data-petak-columns-toggle]');
    const menu = element.querySelector('[data-petak-columns-menu]');
    const ownerDocument = element.ownerDocument;

    if (!toggle || !menu) {
        return () => {};
    }

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.hidden = !open;
    };
    const close = () => setOpen(false);
    const onDocumentClick = (event) => {
        if (!element.contains(event.target)) {
            close();
        }
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            close();
            toggle.focus();
        }
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    ownerDocument.addEventListener('click', onDocumentClick);
    element.addEventListener('keydown', onKeyDown);

    return () => {
        ownerDocument.removeEventListener('click', onDocumentClick);
        element.removeEventListener('keydown', onKeyDown);
    };
}
