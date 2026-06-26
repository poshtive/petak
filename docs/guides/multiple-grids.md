# Multiple Grids

Each grid on a page needs a stable, unique name. Petak uses the name to route
remote data requests, actions, exports, and Blade query state.

## One Controller Method

Build both grids, then let the matching grid answer remote data or action
requests before returning the page:

```php
use Illuminate\Http\Request;
use Poshtive\Petak\Column;
use Poshtive\Petak\Facades\Petak;

public function index(Request $request)
{
    $users = Petak::for(User::query())
        ->name('users')
        ->columns([
            Column::make('id')->integer()->sortable(),
            Column::make('email')->searchable()->sortable()->filterable(),
        ]);

    $orders = Petak::for(Order::query())
        ->name('orders')
        ->columns([
            Column::make('id')->integer()->sortable(),
            Column::make('total')->number()->sortable(),
        ]);

    foreach ([$users, $orders] as $grid) {
        if ($grid->matches($request)) {
            return $grid->response($request);
        }
    }

    return view('dashboard.index', compact('users', 'orders'));
}
```

Render each grid with its own builder:

```blade
<x-petak::grid :grid="$users" />
<x-petak::grid :grid="$orders" />
```

## Actions

If a grid registers bulk actions, exports, or inline edits, route the page with
both `GET` and `POST` and use `handle()` when a page only has one grid:

```php
Route::match(['get', 'post'], '/users', [UserController::class, 'index']);
```

For pages with multiple action-enabled grids on the same route, check the
action grid before returning the view:

```php
if ($request->input('petak_action.grid') === 'users') {
    return $users->handle($request, 'dashboard.index', compact('users', 'orders'));
}

if ($request->input('petak_action.grid') === 'orders') {
    return $orders->handle($request, 'dashboard.index', compact('users', 'orders'));
}
```

For simpler controller flow, keep action-enabled grids on separate named routes
or use separate endpoints for the grids with actions.

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
