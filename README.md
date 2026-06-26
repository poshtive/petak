# Petak (In Development)

**Not ready for production use. The API is subject to change.**

Headless, composable data grids for Laravel.

## Documentation

- [Installation](docs/getting-started/installation.md)
- [Quick Start](docs/getting-started/quick-start.md)
- [Grid Initialization Patterns](docs/getting-started/grid-initialization-patterns.md)
- [Demo Gallery](docs/demo/README.md)
- [Kitchen Sink Demo](docs/demo/kitchen-sink.md)
- [Guides](docs/README.md#guides)
- [Reference](docs/README.md#reference)

## Quick example

```php
use App\Models\User;
use Illuminate\Http\Request;
use Poshtive\Petak\Column;
use Poshtive\Petak\Facades\Petak;

public function index(Request $request)
{
    $grid = Petak::grid()
        ->source(User::query())
        ->name('users')
        ->globalSearch()
        ->columns([
            Column::make('id')->integer()->sortable(),
            Column::make('name')->searchable()->sortable()->filterable(),
            Column::make('email')->searchable()->sortable()->filterable(),
            Column::make('created_at')->date()->sortable()->filterable(),
        ]);

    return $grid->handle($request, 'users.index');
}
```

```blade
<x-petak::grid :grid="$grid" />
```

For one-off grids, `Petak::for($source)` is the shorthand alias for
`Petak::grid()->source($source)`:

```php
$grid = Petak::for(User::query())
    ->name('users')
    ->columns(['id', 'name', 'email']);
```

## Blade renderer

Blade uses the same definition and query engine as the Tabulator renderer:

```blade
<x-petak::grid :grid="$grid" renderer="blade" />
```

Filter, search, sort, page, and page-size state is stored under
`petak_state[grid-name]` in the URL.

## Livewire transport

Livewire is optional. The package does not require `livewire/livewire`.

```php
use Poshtive\Petak\Concerns\InteractsWithPetak;

class UsersTable extends Component
{
    use InteractsWithPetak;

    protected function petakGrid(string $name): GridBuilder
    {
        return Petak::grid()
            ->source(User::query())
            ->name($name)
            ->columns(['id', 'email']);
    }

    public function render()
    {
        return view('livewire.users-table', [
            'grid' => $this->petakGrid('users'),
        ]);
    }
}
```

```blade
<x-petak::grid
    :grid="$grid"
    transport="livewire"
/>
```

The renderer is placed inside `wire:ignore`. Petak initializes newly morphed
grids once and destroys renderer instances when their DOM is removed.

Refresh one grid from JavaScript:

```js
document.dispatchEvent(new CustomEvent('petak:refresh', {
    detail: { grid: 'users' },
}));
```

Omit `grid` to refresh every active Petak grid.

## State and saved views

```php
use Poshtive\Petak\State\GridState;

$grid->state(
    GridState::make('admin.users')
        ->store('local-storage')
        ->version(1),
);
```

The Tabulator adapter persists page size, sort, filters, search, column order,
and column visibility. Saved views use the same versioned storage key through
`savePetakView()` and `loadPetakViews()`.

## Bulk actions, export, and inline editing

```php
$grid
    ->rowKey('uuid')
    ->bulkActions([
        BulkAction::make('activate')
            ->authorize(fn () => auth()->user()->can('update users'))
            ->handle(fn (Selection $selection) =>
                User::whereKey($selection->keys())->update(['active' => true])
            ),
    ])
    ->exports([
        CsvExport::make(),
        XlsxExport::make(),
    ])
    ->columns([
        Column::make('email')->editableUsing(
            fn ($key, $value) =>
                User::whereKey($key)->update(['email' => $value])
        ),
    ]);
```

All mutations and exports are dispatched to the grid page URL and only execute
registered server callbacks. Export reruns the active canonical filter and sort
request and excludes non-exportable columns such as actions. CSV export streams
rows from the active data source and uses `Column::exportUsing()` when present.

Excel export is optional. Install OpenSpout in the host application to enable
`XlsxExport`; without it, the XLSX export is not exposed in the grid schema.

```bash
composer require openspout/openspout
```

The action URL must accept `POST` so Laravel can enforce CSRF protection. With
the Poshtive auto-discovery router, declare the grid controller method with both
methods:

```php
#[Route(method: ['get', 'post'])]
public function index(Request $request)
{
    return $grid->handle($request, 'users.index');
}
```

Petak rejects non-POST mutation/export requests even if the route also accepts
GET. Nested filter groups are available through canonical filter nodes
containing `boolean` plus `filters`.

Local array and collection grids are intended for small datasets. The initial
browser payload is capped by `petak.max_local_rows` and larger datasets should
use remote mode.

## Styling

Petak exposes separate CSS entry points:

```js
import '@poshtive/petak/petak.css'; // structure + neutral theme
import '@poshtive/petak/structural.css'; // structure only
import '@poshtive/petak/themes/bootstrap.css'; // optional compatibility theme
```

Appearance stays semantic:

```php
$grid
    ->density('compact')
    ->striped()
    ->bordered()
    ->theme(null)
    ->className('users-grid');

Column::make('amount')
    ->align('end')
    ->responsivePriority(2);

Column::make('reference')
    ->fitContent();
```

Leave `theme` as `null` to let Petak follow application tokens, Bootstrap
variables, or the browser color scheme fallback. Use `theme('dark')` as a
per-grid override.

Columns named `id` or ending in `_id`, and `ActionColumn`, fit their rendered
content by default. Call `fitContent(false)` to opt out.

Both Blade and Tabulator renderers consume the same `--petak-*` token contract.
Applications should override those tokens on `.petak` instead of targeting
Tabulator internals.

The Bootstrap compatibility theme only maps standard `--bs-*` variables. Brand
or application-specific mappings belong in userland CSS loaded after the
package:

```css
.admin-page .petak {
    --petak-surface: var(--admin-input);
    --petak-border-color: var(--admin-border);
}
```

## License

MIT License. See [LICENSE](LICENSE) for details.
