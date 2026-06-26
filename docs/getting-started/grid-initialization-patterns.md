# Grid Initialization Patterns

Petak supports inline builders, reusable grid classes, named factories, and a
short `for()` alias. All paths compile to the same grid definition and execution
pipeline.

## Inline Builder

Use the inline builder for small grids that only appear in one controller:

```php
use Illuminate\Http\Request;
use App\Models\User;
use Poshtive\Petak\Column;
use Poshtive\Petak\Facades\Petak;

public function index(Request $request)
{
    return Petak::grid()
        ->source(User::query())
        ->name('users')
        ->columns([
            Column::make('id')->integer()->sortable(),
            Column::make('name')->searchable()->sortable()->filterable(),
            Column::make('email')->searchable()->sortable()->filterable(),
        ])
        ->handle($request, 'users.index');
}
```

## Shorthand Alias

`Petak::for($source)` is a shorthand alias for
`Petak::grid()->source($source)`. It is useful for simple one-off grids:

```php
Petak::for(User::query())
    ->name('users')
    ->columns(['id', 'name', 'email'])
    ->sortable()
    ->filterable();
```

String columns are normalized into `Column` instances.

## Grid Class

Use a grid class when the definition is reused, needs dependencies, or grows
past a small controller method:

```php
use App\Models\User;
use App\Support\UserGridPolicy;
use Poshtive\Petak\Column;
use Poshtive\Petak\Grid;
use Poshtive\Petak\GridBuilder;

final class UsersGrid extends Grid
{
    public function __construct(private readonly UserGridPolicy $policy) {}

    public function configure(GridBuilder $grid): void
    {
        $grid
            ->source(User::query()->withCount('roles'))
            ->name('users')
            ->columns([
                Column::make('id')->integer()->sortable(),
                Column::make('email')->searchable()->sortable()->filterable(),
                Column::make('roles_count')->integer()->sortable(),
            ])
            ->exports($this->policy->exports());
    }
}
```

Resolve the class through the Laravel container:

```php
public function index(Request $request)
{
    return Petak::grid(UsersGrid::class)->handle($request, 'users.index');
}
```

Constructor dependencies and method dependencies on `configure()` are resolved
by the container.

## One Route

The default pattern is a single route and controller method for the page, remote
data, and POST actions:

```php
Route::match(['get', 'post'], '/users', [UserController::class, 'index'])
    ->name('users.index');
```

Petak detects grid data requests with the `X-Petak-Request` header or the
`petak` query marker.

## Separate Data Endpoint

Use a separate endpoint when data responses need different middleware, cache
policy, rate limits, or permissions:

```php
public function index()
{
    return view('users.index', [
        'grid' => Petak::grid()
            ->source(User::query())
            ->name('users')
            ->columns(['id', 'email']),
    ]);
}

public function data()
{
    return Petak::grid()
        ->source(User::query())
        ->name('users')
        ->columns(['id', 'email'])
        ->response();
}
```

## Reusable Named Grid

Use a named factory when multiple controllers need the same simple definition:

```php
Petak::define('users', fn (GridBuilder $grid) =>
    $grid
        ->source(User::query())
        ->columns([
            Column::make('id')->integer()->sortable(),
            Column::make('email')->searchable()->sortable()->filterable(),
        ])
);
```

Resolve the factory per request:

```php
public function index(Request $request)
{
    return Petak::get('users')->handle($request, 'users.index');
}
```

Factories return a fresh builder so request state is not shared across requests.
