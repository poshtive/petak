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
        views() {
            return {
                load() {
                    try {
                        return JSON.parse(window.localStorage.getItem(`${key}:views`) ?? '{}');
                    } catch {
                        return {};
                    }
                },
                save(views) {
                    window.localStorage.setItem(`${key}:views`, JSON.stringify(views));
                },
            };
        },
    };
}

export function savePetakView(config, name, state) {
    const views = stateStorage(config)?.views();

    if (!views) {
        return;
    }

    views.save({ ...views.load(), [name]: state });
}

export function loadPetakViews(config) {
    return stateStorage(config)?.views().load() ?? {};
}
