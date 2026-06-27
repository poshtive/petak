# Columns Showcase

Columns can resolve values, format alignment, render trusted HTML, control
responsiveness, and participate in export.

```php
use Poshtive\Petak\Column;
use Poshtive\Petak\Columns\ActionColumn;
use Poshtive\Petak\Columns\HtmlColumn;

$grid->columns([
    Column::make('id')
        ->integer()
        ->compact(),

    Column::make('name')
        ->label('Customer')
        ->searchable()
        ->sortable(),

    Column::make('team')
        ->valueUsing(fn ($user) => $user->team?->name)
        ->filterable(),

    HtmlColumn::make('status')
        ->renderUsing(fn ($user) => view('users.status', [
            'active' => $user->active,
        ])),

    Column::make('amount')
        ->number()
        ->align('end')
        ->exportUsing(fn ($row) => number_format($row->amount, 2, '.', '')),

    Column::make('created_at')
        ->date()
        ->responsivePriority(2),

    ActionColumn::make()->view('users.actions'),
]);
```
