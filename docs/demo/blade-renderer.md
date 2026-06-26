# Blade Renderer

The Blade renderer uses plain server-rendered HTML and URL query state.

```blade
<x-petak::grid :grid="$grid" renderer="blade" />
```

Controller:

```php
$grid = Petak::for(User::query())
    ->name('users')
    ->globalSearch()
    ->columns([
        Column::make('id')->integer()->sortable(),
        Column::make('name')->searchable()->sortable()->filterable(),
        Column::make('email')->searchable()->filterable(),
    ]);

return $grid->handle($request, 'users.index', [
    'renderer' => 'blade',
]);
```

Blade state is stored under `petak_state[grid-name]`.

