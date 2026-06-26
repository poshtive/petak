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

## Search Length

`max_search_length` caps global search input sent to the server.
