import { activeElements, instances } from '../core/registry.js';
import { createPetakGrid } from '../renderers/index.js';

let lifecycleInitialized = false;

export function refreshPetak(requestedGrid = null) {
    activeElements.forEach((element) => {
        const instance = instances.get(element);
        const config = JSON.parse(document.getElementById(element.dataset.petakConfig)?.textContent ?? '{}');

        if (!requestedGrid || requestedGrid === config.name) {
            instance?.reload();
        }
    });
}

export function destroyDisconnectedPetak() {
    activeElements.forEach((element) => {
        if (!element.isConnected) {
            instances.get(element)?.destroy();
        }
    });
}

function initializeLifecycle() {
    if (lifecycleInitialized) {
        return;
    }

    lifecycleInitialized = true;

    document.addEventListener('petak:refresh', (event) => {
        refreshPetak(event.detail?.grid);
    });

    new MutationObserver((records) => {
        destroyDisconnectedPetak();

        records.forEach((record) => {
            record.addedNodes.forEach((node) => {
                if (node instanceof Element) {
                    initializePetak(node);
                }
            });
        });
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

export function initializePetak(root = document) {
    initializeLifecycle();
    root.querySelectorAll?.('[data-petak-grid]').forEach((element) => createPetakGrid(element));
}
