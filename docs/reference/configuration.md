# Configuration Reference

Publish the config:

```bash
php artisan vendor:publish --tag=petak-config
```

Default values:

```php
return [
    'protocol_version' => '1',
    'default_page_size' => 25,
    'page_sizes' => [10, 25, 50, 100],
    'max_page_size' => 250,
    'max_local_rows' => 1000,
    'max_filters' => 20,
    'max_filter_depth' => 3,
    'max_search_length' => 100,
    'default_renderer' => 'tabulator',
    'preload' => false,
    'responsive' => [
        'layout' => null,
        'collapse_start_open' => false,
    ],
    'appearance' => [
        'density' => 'comfortable',
        'striped' => false,
        'bordered' => true,
        'theme' => null,
        'vertical_align' => 'middle',
    ],
];
```

`appearance.theme` defaults to `null`, which means grids follow the surrounding
application tokens. If the page does not expose `data-bs-theme` or `data-theme`,
the default theme falls back to `prefers-color-scheme`. Set `dark` only to force
a specific grid into dark mode.

## Local Row Limit

`max_local_rows` caps initial local-mode payload size. Use remote grids for
database-backed application data.

## Preload

`preload` controls whether remote Tabulator grids include the first result page
in their initial configuration. It defaults to `false`; enable it globally only
when the extra server-side query during page rendering is acceptable.

## Responsive Layout

`responsive.layout` accepts `null`, `hide`, or `collapse`. Use `collapse` to
move columns with larger `responsivePriority()` values into Tabulator's
responsive row area when the table narrows.

## Search Length

`max_search_length` caps global search input sent to the server.
