# Quick Start

Create a grid in a controller:

```php
use Illuminate\Http\Request;
use App\Models\User;
use Poshtive\Petak\Column;
use Poshtive\Petak\Facades\Petak;

public function index(Request $request)
{
    $grid = Petak::grid()
        ->source(User::query())
        ->name('users')
        ->columns([
            Column::make('id')->integer()->sortable(),
            Column::make('name')->searchable()->sortable()->filterable(),
            Column::make('email')->searchable()->sortable()->filterable(),
            Column::make('created_at')->date()->sortable()->filterable(),
        ])
        ->globalSearch();

    return $grid->handle($request, 'users.index');
}
```

Render the grid:

```blade
<x-petak::grid :grid="$grid" />
```

For one-off grids, use the shorthand alias:

```php
$grid = Petak::for(User::query())
    ->name('users')
    ->columns(['id', 'name', 'email']);
```

`Petak::for($source)` is equivalent to `Petak::grid()->source($source)`.

For routes that use actions, exports, or inline editing, allow `GET` and
`POST`:

```php
Route::match(['get', 'post'], '/users', [UserController::class, 'index'])
    ->name('users.index');
```

Petak serves the page for normal visits, returns JSON for grid data requests,
and accepts POST requests for registered server-side actions.
