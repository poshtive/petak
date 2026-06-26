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

Filters own their value normalization and their default database/local matching
behavior. Use a custom filter class when a new operator should work across
remote and local sources:

```php
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Poshtive\Petak\Filters\Filter;

final class DivisibleByFilter extends Filter
{
    protected string $defaultOperator = 'divisible_by';

    protected array $operators = ['divisible_by'];

    public static function type(): string
    {
        return 'divisible-by';
    }

    public function applyDatabase(
        EloquentBuilder|QueryBuilder $query,
        string $field,
        string $operator,
        mixed $value,
    ): void {
        $query->whereRaw("{$field} % ? = 0", [$value]);
    }

    public function matches(mixed $actual, string $operator, mixed $expected): bool
    {
        return (int) $expected !== 0 && (int) $actual % (int) $expected === 0;
    }

    protected function normalizeValue(string $operator, mixed $value): int
    {
        return (int) $value;
    }
}
```

Use `filterUsing()` for one-off database query overrides, such as relation
filters:

```php
Column::make('team')
    ->filter(TextFilter::make())
    ->filterUsing(function ($query, string $operator, mixed $value): void {
        $query->whereHas('team', fn ($team) => $team->where('name', 'like', "%{$value}%"));
    });
```
