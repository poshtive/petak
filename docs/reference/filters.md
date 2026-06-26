# Filters Reference

Petak ships typed filters for common column types.

## TextFilter

Operators:

- `contains`
- `not_contains`
- `starts_with`
- `ends_with`
- `equals`
- `not_equals`
- `is_empty`
- `is_not_empty`

## NumberFilter

Operators:

- `equals`
- `not_equals`
- `greater_than`
- `greater_or_equal`
- `less_than`
- `less_or_equal`
- `between`
- `not_between`

## BooleanFilter

Operators:

- `equals`
- `not_equals`

## DateFilter

Operators:

- `equals`
- `not_equals`
- `greater_than`
- `greater_or_equal`
- `less_than`
- `less_or_equal`
- `between`
- `not_between`

## Custom Filter Callbacks

```php
Column::make('team')
    ->filter(TextFilter::make())
    ->filterUsing(function ($query, string $operator, mixed $value): void {
        $query->whereHas('team', fn ($team) => $team->where('name', 'like', "%{$value}%"));
    });
```

