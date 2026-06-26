# Export

CSV export works without extra packages. Excel export is enabled by installing
OpenSpout.

```php
use Poshtive\Petak\Exports\CsvExport;
use Poshtive\Petak\Exports\XlsxExport;

$grid->exports([
    CsvExport::make(),
    XlsxExport::make(),
]);
```

Customize export values per column:

```php
Column::make('amount')
    ->number()
    ->exportUsing(fn ($invoice) =>
        number_format((float) $invoice->amount, 2, '.', '')
    );
```

Exclude display-only columns:

```php
Column::make('internal_notes')->exportable(false);
```

Authorize exports server-side:

```php
CsvExport::make()
    ->authorize(fn () => auth()->user()->can('export users'));
```

