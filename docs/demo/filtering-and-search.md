# Filtering and Search

Enable global search on the grid and mark individual columns as searchable.
Filters are enabled per column.

```php
$grid = Petak::grid()
    ->source(User::query())
    ->name('users')
    ->globalSearch()
    ->columns([
        Column::make('name')
            ->searchable()
            ->sortable()
            ->filterable(),

        Column::make('email')
            ->searchable()
            ->filterable(),

        Column::make('active')
            ->boolean()
            ->filterable(),

        Column::make('score')
            ->integer()
            ->sortable()
            ->filterable(),

        Column::make('created_at')
            ->date()
            ->filterable(),
    ]);
```

Use custom query callbacks for relation or computed filters:

```php
Column::make('team')
    ->filterable()
    ->filterUsing(function ($query, string $operator, mixed $value): void {
        $query->whereHas('team', function ($team) use ($operator, $value): void {
            $team->where('name', $operator === 'equals' ? '=' : 'like', $value);
        });
    });
```
