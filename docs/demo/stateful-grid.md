# Stateful Grid

State persists page size, sort, filters, search, column order, and visibility in
local storage.

```php
use Poshtive\Petak\State\GridState;

$grid = Petak::for(User::query())
    ->name('users')
    ->state(
        GridState::make('admin.users')
            ->store('local-storage')
            ->version(1)
    )
    ->columns([
        Column::make('name')->searchable()->sortable()->filterable(),
        Column::make('email')->searchable()->sortable()->filterable(),
        Column::make('active')->boolean()->filterable(),
    ]);
```

Version the state when changing column keys or filter behavior.

