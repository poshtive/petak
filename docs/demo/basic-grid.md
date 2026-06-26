# Basic Grid

Use shorthand columns for simple grids:

```php
$grid = Petak::grid()
    ->source(User::query())
    ->name('users')
    ->columns(['id', 'name', 'email', 'created_at']);
```

Render:

```blade
<x-petak::grid :grid="$grid" />
```

Add sorting and filtering where needed:

```php
$grid = Petak::grid()
    ->source(User::query())
    ->name('users')
    ->columns([
        Column::make('id')->integer()->sortable(),
        Column::make('name')->sortable()->filterable(),
        Column::make('email')->sortable()->filterable(),
        Column::make('created_at')->date()->sortable()->filterable(),
    ]);
```
