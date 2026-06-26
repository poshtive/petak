<?php

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
