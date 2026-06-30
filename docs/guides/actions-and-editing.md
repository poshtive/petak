# Actions and Inline Editing

Actions and edits always run registered server callbacks.

## Row Key

Petak uses `id` by default. Configure a different key when your rows use UUIDs
or aliases:

```php
$grid->rowKey('uuid');
```

## Bulk Actions

```php
use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Actions\Selection;

$grid->bulkActions([
    BulkAction::make('activate')
        ->label('Activate')
        ->authorize(fn () => auth()->user()->can('update users'))
        ->handle(fn (Selection $selection) =>
            User::whereIn('uuid', $selection->keys())
                ->update(['active' => true])
        ),
]);
```

Unauthorized bulk actions are hidden from the grid schema and still rejected
with `403` if a client posts the action manually.

## Inline Editing

```php
Column::make('name')
    ->editableUsing(fn ($key, $value, $request) =>
        User::where('uuid', $key)->update(['name' => $value])
    );
```

When an edit fails, the native renderer restores the old value and displays
the error status.

## Action Routes

Use a route that accepts both the page visit and action POST:

```php
Route::match(['get', 'post'], '/users', [UserController::class, 'index']);
```

Petak accepts mutation/export actions over POST.
