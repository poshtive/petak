# State and Saved Views

Enable state persistence with `GridState`:

```php
use Poshtive\Petak\State\GridState;

$grid->state(
    GridState::make('admin.users')
        ->store('local-storage')
        ->version(1)
);
```

The Tabulator adapter persists:

- page size
- sort
- filters
- search
- column order
- column visibility

Saved views use the same versioned storage key:

```js
import { savePetakView, loadPetakViews } from '@poshtive/petak';

savePetakView(config, 'Active users', state);
const views = loadPetakViews(config);
```

Increment the state version after changing column keys or filter behavior.

