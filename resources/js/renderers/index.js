import { createNativeGrid } from './native/index.js';

export function createPetakGrid(element, options = {}) {
    const configElement = document.getElementById(element.dataset.petakConfig);
    const config = options.config ?? JSON.parse(configElement?.textContent ?? '{}');

    return createNativeGrid(element, { ...options, config });
}

export { createNativeGrid };
