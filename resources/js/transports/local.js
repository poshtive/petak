export function localTransport(initialRows = []) {
    return {
        async load() {
            return {
                version: '1',
                data: initialRows,
                meta: {
                    pagination: {
                        mode: 'local',
                        page: 1,
                        per_page: initialRows.length,
                        total: initialRows.length,
                        last_page: 1,
                        from: initialRows.length > 0 ? 1 : null,
                        to: initialRows.length || null,
                    },
                    aggregates: [],
                },
                errors: [],
            };
        },
    };
}
