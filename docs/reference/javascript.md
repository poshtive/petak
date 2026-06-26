# JavaScript API

Import from `@poshtive/petak`:

```js
import {
    initializePetak,
    refreshPetak,
    destroyDisconnectedPetak,
    savePetakView,
    loadPetakViews,
} from '@poshtive/petak';
```

## initializePetak

```js
initializePetak(root = document);
```

Initializes every `[data-petak-grid]` under `root`.

## refreshPetak

```js
refreshPetak('users');
refreshPetak();
```

Refresh one remote grid by name, or every active remote grid.

## Saved Views

```js
savePetakView(config, 'Active users', state);
const views = loadPetakViews(config);
```

Views are stored with the grid state key and version.

