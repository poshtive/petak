# Filtering, Sorting, and Search

Petak enables sorting, filtering, and search only for columns you mark as
eligible.

## Sorting

```php
Column::make('name')->sortable();
```

Use a custom sort callback for computed values:

```php
Column::make('rank')
    ->valueUsing(fn ($user) => $user->score * 2)
    ->sortableUsing(fn ($query, $direction) =>
        $query->orderBy('score', $direction->value)
    );
```

## Filtering

```php
Column::make('name')->filterable();
Column::make('score')->integer()->filterable();
Column::make('active')->boolean()->filterable();
Column::make('created_at')->date()->filterable();
```

Use explicit filter definitions when needed:

```php
use Poshtive\Petak\Filters\TextFilter;

Column::make('team')
    ->filter(TextFilter::make())
    ->filterUsing(function ($query, string $operator, mixed $value): void {
        $query->whereHas('team', fn ($team) =>
            $team->where('name', $operator === 'equals' ? '=' : 'like', $value)
        );
    });
```

## Global Search

```php
$grid
    ->globalSearch()
    ->columns([
        Column::make('name')->searchable(),
        Column::make('email')->searchable(),
    ]);
```

Search length is capped by `petak.max_search_length`.

