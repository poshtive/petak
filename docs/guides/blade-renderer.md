# Blade Renderer

The Blade renderer returns a server-rendered table.

```blade
<x-petak::grid :grid="$grid" renderer="blade" />
```

It uses the same grid definition and data source execution as the Tabulator
renderer. State is stored in the URL under `petak_state[grid-name]`.

```php
$grid = Petak::for(User::query())
    ->name('users')
    ->globalSearch()
    ->columns([
        Column::make('id')->integer()->sortable(),
        Column::make('name')->searchable()->sortable()->filterable(),
        Column::make('email')->searchable()->filterable(),
    ]);
```

Use the Blade renderer for simple server-rendered screens and no-JavaScript
fallbacks.

