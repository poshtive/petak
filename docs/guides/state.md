# State Persistence

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

Increment the state version after changing column keys or filter behavior.
