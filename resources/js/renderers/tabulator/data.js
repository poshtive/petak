import { canonicalRequest } from '../../core/request.js';

export function tabulatorResult(result) {
    const pagination = result?.meta?.pagination ?? {};

    return {
        data: result?.data ?? [],
        last_page: pagination.last_page ?? 1,
        last_row: pagination.total ?? result?.data?.length ?? 0,
    };
}

export function createRemoteDataAdapter({ config, element, status, transport, search }) {
    let firstLoadDone = !(config.mode === 'remote' && config.initialResult);
    let lastRequest = canonicalRequest(config, {}, search?.value ?? '');

    return {
        getLastRequest() {
            return lastRequest;
        },

        async load(_url, _requestConfig, params = {}) {
            if (!firstLoadDone) {
                firstLoadDone = true;
                return tabulatorResult(config.initialResult);
            }

            if (status) {
                status.textContent = '';
            }
            element.classList.remove('petak-has-error');

            try {
                lastRequest = canonicalRequest(config, params, search?.value ?? '');
                return tabulatorResult(await transport.load(lastRequest));
            } catch (error) {
                if (error.name !== 'AbortError') {
                    if (status) {
                        status.textContent = error.message;
                    }
                    element.classList.add('petak-has-error');
                }

                throw error;
            }
        },
    };
}
