# Export

Petak exports the active server-side request, including filters, search, and
sort.

## CSV

```php
use Poshtive\Petak\Exports\CsvExport;

$grid->exports([
    CsvExport::make(),
]);
```

CSV streams rows from the data source.

## Excel

Install the optional writer:

```bash
composer require openspout/openspout
```

Register the export:

```php
use Poshtive\Petak\Exports\XlsxExport;

$grid->exports([
    XlsxExport::make(),
]);
```

## Export Values

```php
Column::make('amount')
    ->exportUsing(fn ($invoice) =>
        number_format((float) $invoice->amount, 2, '.', '')
    );
```

## Authorization

```php
CsvExport::make()
    ->authorize(fn () => auth()->user()->can('export users'));
```

