# Data Sources

Petak accepts Eloquent builders, query builders, arrays, collections, and custom
data sources.

## Eloquent

```php
Petak::grid()
    ->source(User::query())
    ->name('users')
    ->columns(['id', 'name', 'email']);
```

Use Eloquent when columns rely on model accessors, relations, or view partials.

## Query Builder

```php
Petak::grid()
    ->source(DB::table('users')
        ->join('teams', 'users.team_id', '=', 'teams.id')
        ->select([
            'users.id',
            'users.name',
            'teams.name as team_name',
        ]))
    ->name('users')
    ->columns([
        Column::make('id')->sortBy('users.id')->sortable(),
        Column::make('team_name')
            ->filterBy('teams.name')
            ->sortBy('teams.name')
            ->filterable()
            ->sortable(),
    ]);
```

Use `sortBy()` and `filterBy()` when the display key differs from the database
field.

## Arrays and Collections

```php
Petak::grid()
    ->source([
        ['id' => 1, 'name' => 'Ada'],
        ['id' => 2, 'name' => 'Linus'],
    ])
    ->columns(['id', 'name']);
```

Array and collection grids are local grids. They are best for small in-memory
datasets and are capped by `petak.max_local_rows`.

## Custom Data Sources

Implement `Poshtive\Petak\Sources\DataSource`:

```php
use Poshtive\Petak\GridDefinition;
use Poshtive\Petak\GridRequest;
use Poshtive\Petak\GridResult;
use Poshtive\Petak\Sources\DataSource;

final class ApiSource implements DataSource
{
    public function execute(GridDefinition $definition, GridRequest $request): GridResult
    {
        // Return rows and pagination metadata.
    }

    public function exportRows(GridDefinition $definition, GridRequest $request): iterable
    {
        // Yield rows for export.
    }

    public function isLocal(): bool
    {
        return false;
    }
}
```
