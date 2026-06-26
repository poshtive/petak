# Installation

Install the PHP package:

```bash
composer require poshtive/petak
```

Install the JavaScript package and Tabulator peer dependency:

```bash
pnpm add @poshtive/petak tabulator-tables
```

Publish the configuration file when you want to customize defaults:

```bash
php artisan vendor:publish --tag=petak-config
```

Petak v1 targets PHP `^8.3` and Laravel/Illuminate `^13.0`.

## Optional Excel Export

CSV export works out of the box. Install OpenSpout to enable Excel export:

```bash
composer require openspout/openspout
```

When OpenSpout is available, `XlsxExport::make()` appears in the grid export
schema. Without it, the grid continues to work and the Excel export button is
not exposed.

