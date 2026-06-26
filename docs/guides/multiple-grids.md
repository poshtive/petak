# Multiple Grids

Each grid on a page needs a stable, unique name. Petak uses the name to route
remote data requests, actions, exports, and Blade query state.

## Page Helper

Use `Petak::page()` when one route renders and serves multiple grids:

```php
use Illuminate\Http\Request;
use Poshtive\Petak\Column;
use Poshtive\Petak\Facades\Petak;

public function index(Request $request)
{
    return Petak::page()
        ->grid('users', fn () => Petak::for(User::query())
            ->columns([
                Column::make('id')->integer()->sortable(),
                Column::make('email')->searchable()->sortable()->filterable(),
            ]))
        ->grid('orders', fn () => Petak::for(Order::query())
            ->columns([
                Column::make('id')->integer()->sortable(),
                Column::make('total')->number()->sortable(),
            ]))
        ->handle($request, 'dashboard.index');
}
```

The grid name passed to `grid()` is applied to the builder and used as the
default view variable.

Render each grid with its own builder:

```blade
<x-petak::grid :grid="$users" />
<x-petak::grid :grid="$orders" />
```

`handle()` returns the matching grid response for remote data requests, runs
matching grid actions, or renders the view with all grid builders.

## Builder Factories

Factories may return a `GridBuilder`:

```php
->grid('users', fn () => Petak::for(User::query())->columns(['id', 'email']))
```

They may also configure the provided builder:

```php
->grid('orders', fn (GridBuilder $grid) => $grid
    ->source(Order::query())
    ->columns(['id', 'total']))
```

Grid classes are supported too:

```php
->grid('users', UsersGrid::class)
```

Use `as` when the view variable should differ from the grid request name:

```php
->grid('recent-users', UsersGrid::class, as: 'users')
```

## Actions

If a grid registers bulk actions, exports, or inline edits, route the page with
both `GET` and `POST`:

```php
Route::match(['get', 'post'], '/users', [UserController::class, 'index']);
```

`Petak::page()->handle()` reads `petak_action.grid` and dispatches the action to
the matching registered grid.

## Separate Endpoints

Separate endpoints are useful when grids need different middleware,
permissions, caching, or rate limits:

```php
Route::get('/dashboard', [DashboardController::class, 'index']);
Route::get('/dashboard/users', [DashboardController::class, 'users']);
Route::get('/dashboard/orders', [DashboardController::class, 'orders']);
```

Pass each endpoint to the matching component:

```blade
<x-petak::grid :grid="$users" :endpoint="route('dashboard.users')" />
<x-petak::grid :grid="$orders" :endpoint="route('dashboard.orders')" />
```

## Blade State

The Blade renderer stores URL state under `petak_state[grid-name]`. Unique grid
names keep filter, search, sort, and pagination state separate:

```php
$users->name('users');
$orders->name('orders');
```
