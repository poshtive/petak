<?php

namespace Poshtive\Petak;

use Poshtive\Petak\Enums\GridMode;
use Poshtive\Petak\Sources\DataSource;

final readonly class GridDefinition
{
    /**
     * @param  array<string, Column>  $columns
     * @param  list<array{field: string, direction: string}>  $defaultSort
     * @param  list<int>  $pageSizes
     */
    public function __construct(
        public string $name,
        public DataSource $source,
        public array $columns,
        public GridMode $mode,
        public int $defaultPageSize,
        public int $maxPageSize,
        public array $pageSizes,
        public array $defaultSort = [],
        public string $paginationMode = 'page',
        public array $appearance = [],
        public ?string $className = null,
        public string $rowKey = 'id',
        public bool $preload = false,
        public array $responsive = [],
    ) {}

    public function column(string $key): ?Column
    {
        return $this->columns[$key] ?? null;
    }

    /** @return array<string, mixed> */
    public function schema(): array
    {
        return [
            'version' => '1',
            'name' => $this->name,
            'mode' => $this->mode->value,
            'row_key' => $this->rowKey,
            'columns' => array_values(array_map(
                static fn (Column $column) => $column->toArray(),
                $this->columns,
            )),
            'pagination' => [
                'mode' => $this->paginationMode,
                'default_page_size' => $this->defaultPageSize,
                'max_page_size' => $this->maxPageSize,
                'page_sizes' => $this->pageSizes,
            ],
            'appearance' => $this->appearance,
            'class_name' => $this->className,
            'preload' => $this->preload,
            'responsive' => $this->responsive,
        ];
    }
}
