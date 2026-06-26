export async function executePetakAction(config, action) {
    const exportConfig = action.type === 'export'
        ? config.exports?.find((candidate) => candidate.name === action.name)
        : null;
    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
            Accept: action.type === 'export' ? exportConfig?.mime ?? 'application/octet-stream' : 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
        },
        body: JSON.stringify({
            petak_action: {
                grid: config.name,
                ...action,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Petak action failed (${response.status}).`);
    }

    return action.type === 'export' ? response.blob() : response.json();
}
