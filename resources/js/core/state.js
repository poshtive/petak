export function stateStorage(config) {
    if (!config.state || config.state.store !== 'local-storage') {
        return null;
    }

    const key = `petak:${config.state.key}:v${config.state.version}`;

    return {
        load() {
            try {
                return JSON.parse(window.localStorage.getItem(key) ?? 'null');
            } catch {
                return null;
            }
        },
        save(state) {
            window.localStorage.setItem(key, JSON.stringify(state));
        },
    };
}
