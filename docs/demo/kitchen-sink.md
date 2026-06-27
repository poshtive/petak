# Kitchen Sink Grid

This demo shows the main Petak feature set in one grid: remote data loading,
pagination, search, typed filters, sortable columns, custom columns, trusted
HTML, row actions, bulk actions, inline editing, export, state persistence, row
keys, and styling.

## Route

```php
use App\Http\Controllers\Admin\UserGridController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/admin/users', UserGridController::class)
    ->name('admin.users.index');
```

## Controller

```php
namespace App\Http\Controllers\Admin;

use App\Models\User;
use Illuminate\Http\Request;
use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Actions\Selection;
use Poshtive\Petak\Column;
use Poshtive\Petak\Columns\ActionColumn;
use Poshtive\Petak\Columns\HtmlColumn;
use Poshtive\Petak\Exports\CsvExport;
use Poshtive\Petak\Exports\XlsxExport;
use Poshtive\Petak\Facades\Petak;
use Poshtive\Petak\State\GridState;

final class UserGridController
{
    public function __invoke(Request $request)
    {
        $grid = Petak::grid()
            ->source(User::query()->with('team'))
            ->name('admin-users')
            ->rowKey('uuid')
            ->globalSearch()
            ->state(GridState::make('admin.users')->version(1))
            ->density('compact')
            ->striped()
            ->bordered()
            ->className('admin-users-grid')
            ->bulkActions([
                BulkAction::make('activate')
                    ->label('Activate')
                    ->authorize(fn () => $request->user()->can('update users'))
                    ->handle(fn (Selection $selection) =>
                        User::whereIn('uuid', $selection->keys())
                            ->update(['active' => true])
                    ),
            ])
            ->exports([
                CsvExport::make(),
                XlsxExport::make(),
            ])
            ->columns([
                Column::make('uuid')->label('ID')->compact()->exportable(false),

                Column::make('name')
                    ->searchable()
                    ->sortable()
                    ->filterable()
                    ->editableUsing(fn ($key, $value) =>
                        User::where('uuid', $key)->update(['name' => $value])
                    ),

                Column::make('email')
                    ->searchable()
                    ->sortable()
                    ->filterable(),

                Column::make('team')
                    ->label('Team')
                    ->valueUsing(fn (User $user) => $user->team?->name)
                    ->searchable()
                    ->filterable(),

                HtmlColumn::make('status')
                    ->renderUsing(fn (User $user) => view('admin.users.status', [
                        'active' => $user->active,
                    ])),

                Column::make('orders_total')
                    ->label('Revenue')
                    ->number()
                    ->align('end')
                    ->sortableUsing(fn ($query, $direction) =>
                        $query->orderBy('orders_total', $direction->value)
                    )
                    ->exportUsing(fn (User $user) =>
                        number_format((float) $user->orders_total, 2, '.', '')
                    ),

                Column::make('created_at')
                    ->date()
                    ->sortable()
                    ->filterable()
                    ->responsivePriority(2),

                ActionColumn::make()
                    ->view('admin.users.actions'),
            ]);

        return $grid->handle($request, 'admin.users.index');
    }
}
```

## Blade View

```blade
<x-petak::grid :grid="$grid" />
```

## Status Badge Partial

```blade
@if ($active)
    <span class="badge text-bg-success">Active</span>
@else
    <span class="badge text-bg-secondary">Inactive</span>
@endif
```

## Action Partial

```blade
<div class="btn-group btn-group-sm">
    <a class="btn btn-outline-primary" href="{{ route('admin.users.edit', $model) }}">
        Edit
    </a>
    <a class="btn btn-outline-secondary" href="{{ route('admin.users.show', $model) }}">
        View
    </a>
</div>
```
