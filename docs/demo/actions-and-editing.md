# Actions and Editing

Bulk actions receive a `Selection` object. Inline editing receives the row key,
new value, and request.

```php
use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Actions\Selection;
use Poshtive\Petak\Column;
use Poshtive\Petak\Columns\ActionColumn;

$grid
    ->rowKey('uuid')
    ->bulkActions([
        BulkAction::make('archive')
            ->label('Archive')
            ->handle(fn (Selection $selection) =>
                User::whereIn('uuid', $selection->keys())
                    ->update(['archived_at' => now()])
            ),
    ])
    ->columns([
        Column::make('name')
            ->editableUsing(fn ($key, $value) =>
                User::where('uuid', $key)->update(['name' => $value])
            ),

        ActionColumn::make()->view('users.actions'),
    ]);
```

Action requests are handled by the grid route over `POST`.

