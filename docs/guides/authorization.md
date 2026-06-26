# Authorization

Petak only executes actions that are registered on the server-side grid
definition. The client sends the grid name and action payload, then the server
looks up the matching callback.

## Routes and CSRF

Use a route that accepts `GET` for the page and `POST` for mutations or export:

```php
Route::match(['get', 'post'], '/users', [UserController::class, 'index'])
    ->name('users.index');
```

Petak rejects mutation and export actions that are not sent with `POST`.
Laravel's CSRF middleware should remain enabled for the route. The JavaScript
adapter sends the token from the standard meta tag:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

## Bulk Actions

Authorize every bulk action that changes protected data:

```php
use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Actions\Selection;

$grid->bulkActions([
    BulkAction::make('activate')
        ->label('Activate')
        ->authorize(fn () => auth()->user()->can('update users'))
        ->handle(fn (Selection $selection) =>
            User::whereKey($selection->keys())->update(['active' => true])
        ),
]);
```

Unauthorized bulk actions are omitted from the grid schema and are still
rejected with `403` when posted manually.

## Exports

Exports should use their own authorization callback when exporting data requires
different permission than viewing the grid:

```php
use Poshtive\Petak\Exports\CsvExport;

$grid->exports([
    CsvExport::make()
        ->authorize(fn () => auth()->user()->can('export users')),
]);
```

Export reruns the active server-side filter, search, and sort request.

## Inline Editing

Inline edits are server callbacks. Check authorization inside the resolver or
delegate to a service that already enforces it:

```php
Column::make('email')
    ->editableUsing(function ($key, $value) {
        $user = User::findOrFail($key);

        abort_unless(auth()->user()->can('update', $user), 403);

        return $user->update(['email' => $value]);
    });
```

When an edit fails, the Tabulator adapter restores the old value and shows the
action error status.

