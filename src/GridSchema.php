<?php

namespace Poshtive\Petak;

use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Enums\GridMode;
use Poshtive\Petak\Enums\SortDirection;
use Poshtive\Petak\Exports\CsvExport;
use Poshtive\Petak\Exports\XlsxExport;

/**
 * Builds the JSON grid configuration payload for the frontend.
 */
final class GridSchema
{
    public function __construct(
        private readonly GridBuilder $builder,
        private readonly GridEngine $engine,
    ) {}

    /** @return array<string, mixed> */
    public function build(?string $endpoint = null): array
    {
        $definition = $this->builder->definition();
        $configuration = $definition->schema() + [
            'endpoint' => $endpoint ?? url()->current(),
            'renderer' => $this->builder->defaultRenderer(),
            'global_search' => $this->builder->hasGlobalSearch(),
            'state' => $this->builder->getState()?->toArray(),
            'bulk_actions' => array_values(array_map(
                static fn (BulkAction $action) => $action->toArray(),
                array_filter(
                    $this->builder->getBulkActions(),
                    static fn (BulkAction $action) => $action->authorized(),
                ),
            )),
            'exports' => array_values(array_map(
                static fn (CsvExport|XlsxExport $export) => $export->toArray(),
                array_filter(
                    $this->builder->getExports(),
                    static fn (CsvExport|XlsxExport $export) => $export->available(),
                ),
            )),
        ];

        if ($definition->mode === GridMode::Local || $definition->preload) {
            $configuration['initialResult'] = $this->initialResult($definition);
        }

        return $configuration;
    }

    /** @return array<string, mixed> */
    private function initialResult(GridDefinition $definition): array
    {
        $maxLocalRows = $this->builder->maxLocalRows();

        $request = new GridRequest(
            page: 1,
            pageSize: $definition->mode === GridMode::Local
                ? ($maxLocalRows > 0 ? $maxLocalRows + 1 : PHP_INT_MAX)
                : $definition->defaultPageSize,
            sort: array_map(
                static fn (array $item) => [
                    'field' => $item['field'],
                    'direction' => SortDirection::from($item['direction']),
                ],
                $definition->defaultSort,
            ),
            filters: [],
        );

        $initialResult = $this->engine->execute($definition, $request);
        $total = (int) data_get($initialResult->meta, 'pagination.total', count($initialResult->data));

        if ($definition->mode === GridMode::Local && $maxLocalRows > 0 && $total > $maxLocalRows) {
            throw new \LengthException(
                "Petak local mode is limited to {$maxLocalRows} rows. Use remote mode for larger datasets.",
            );
        }

        return $initialResult->toArray();
    }
}
