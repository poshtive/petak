export function fetchTransport({ endpoint, grid, method = 'GET' }) {
    let controller;
    let activeRequest;

    return {
        async load(request) {
            const fingerprint = JSON.stringify(request);

            if (activeRequest?.fingerprint === fingerprint) {
                return activeRequest.promise;
            }

            controller?.abort();
            controller = new AbortController();

            const url = new URL(endpoint, window.location.href);
            const options = {
                method,
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'X-Petak-Request': grid,
                },
            };

            if (method.toUpperCase() === 'GET') {
                url.searchParams.set('petak', grid);
                url.searchParams.set('petak_request', JSON.stringify(request));
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.headers['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
                options.body = JSON.stringify(request);
            }

            const promise = fetch(url, options).then(async (response) => {
                const result = await response.json().catch(() => null);

                if (!response.ok) {
                    const error = new Error(result?.message ?? `Petak request failed (${response.status}).`);
                    error.response = result;
                    throw error;
                }

                return result;
            }).finally(() => {
                if (activeRequest?.fingerprint === fingerprint) {
                    activeRequest = undefined;
                }
            });

            activeRequest = { fingerprint, promise };

            return promise;
        },
        cancel() {
            controller?.abort();
        },
        destroy() {
            controller?.abort();
            activeRequest = undefined;
        },
    };
}
