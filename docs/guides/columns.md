# Columns

Columns define display values, labels, sorting, filtering, search behavior,
export behavior, editing, and layout hints.

## Shorthand

```php
$grid->columns(['id', 'name', 'email']);
```

## Explicit Columns

```php
$grid->columns([
    Column::make('id')->integer()->sortable(),
    Column::make('name')->label('Customer')->searchable()->filterable(),
    Column::make('created_at')->date()->sortable(),
]);
```

## Value Resolution

```php
Column::make('team')
    ->valueUsing(fn ($user) => $user->team?->name);
```

## Database Field Mapping

```php
Column::make('team_name')
    ->sortBy('teams.name')
    ->filterBy('teams.name')
    ->sortable()
    ->filterable();
```

## HTML and Action Columns

```php
HtmlColumn::make('status')
    ->renderUsing(fn ($user) => view('users.status', ['user' => $user]));

ActionColumn::make()->view('users.actions');
```

HTML columns mark their output as trusted. Use them only for server-rendered
content you control.

## Export Values

```php
Column::make('amount')
    ->number()
    ->exportUsing(fn ($row) => number_format($row->amount, 2, '.', ''));
```

## Layout Hints

```php
Column::make('id')->fitContent();
Column::make('amount')->align('end');
Column::make('status')->align('center');
Column::make('notes')->verticalAlign('top');
Column::make('created_at')->responsivePriority(2);
```

