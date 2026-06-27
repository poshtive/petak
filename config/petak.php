<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Renderer
    |--------------------------------------------------------------------------
    |
    | This renderer is used when the grid component does not receive an
    | explicit renderer. Supported renderers are "tabulator" and "blade".
    |
    */

    'renderer' => 'tabulator',

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    |
    | These values become the default pagination settings for every grid. They
    | can still be overridden per grid with the fluent pagination API.
    |
    */

    'pagination' => [
        'default_page_size' => 25,
        'page_sizes' => [10, 25, 50, 100],
        'max_page_size' => 250,
    ],

    /*
    |--------------------------------------------------------------------------
    | Request Limits
    |--------------------------------------------------------------------------
    |
    | Defensive limits for browser-provided grid requests. Local row limits cap
    | array and collection grids that are sent to the browser.
    |
    */

    'limits' => [
        'max_local_rows' => 1000,
        'max_filters' => 20,
        'max_filter_depth' => 3,
        'max_search_length' => 100,
    ],

    /*
    |--------------------------------------------------------------------------
    | Preloaded Data
    |--------------------------------------------------------------------------
    |
    | When enabled, remote grids include their first result page in the initial
    | page render. Leave this disabled when you prefer the client to fetch data.
    |
    */

    'preload' => false,

    /*
    |--------------------------------------------------------------------------
    | Responsive Layout
    |--------------------------------------------------------------------------
    |
    | Set layout to null, "hide", or "collapse". Collapse mode moves lower
    | priority columns into Tabulator's responsive row area on narrow screens.
    |
    */

    'responsive' => [
        'layout' => null,
        'collapse_start_open' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Renderer Options
    |--------------------------------------------------------------------------
    |
    | Renderer-specific options are intentionally limited to global config so
    | the fluent grid API stays renderer-agnostic.
    |
    | Tabulator layout values: "fitColumns", "fitData", "fitDataFill", or
    | "fitDataStretch". Invalid values fall back to "fitColumns".
    |
    */

    'renderer_options' => [
        'tabulator' => [
            'layout' => 'fitColumns',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Appearance
    |--------------------------------------------------------------------------
    |
    | These defaults are applied to every grid and can be overridden per grid or
    | per column with the fluent styling APIs.
    |
    */

    'appearance' => [
        'density' => 'comfortable',
        'striped' => false,
        'bordered' => true,
        'theme' => null,
        'vertical_align' => 'middle',
    ],
];
