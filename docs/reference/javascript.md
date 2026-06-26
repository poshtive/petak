# JavaScript API

Import from `@poshtive/petak`:

```js
import {
    initializePetak,
    refreshPetak,
    destroyDisconnectedPetak,
    stateStorage,
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

## stateStorage

```js
const storage = stateStorage(config);
const state = storage?.load();
```

Returns a local-storage backed state adapter when the grid has state enabled.
