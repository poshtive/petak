export function livewireTransport({ component, method = 'loadPetak' }) {
    if (!component?.call) {
        throw new Error('Petak could not resolve the owning Livewire component.');
    }

    let generation = 0;
    let destroyed = false;

    return {
        async load(request) {
            const current = ++generation;
            const result = await component.call(method, request);

            if (destroyed || current !== generation) {
                const error = new Error('Petak Livewire request was superseded.');
                error.name = 'AbortError';
                throw error;
            }

            return result;
        },
        cancel() {
            generation += 1;
        },
        destroy() {
            destroyed = true;
            generation += 1;
        },
    };
}
