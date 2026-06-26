<?php

namespace Poshtive\Petak\Sources;

use Illuminate\Support\Collection;
use Poshtive\Petak\GridDefinition;
use Poshtive\Petak\GridRequest;
use Poshtive\Petak\GridResult;
use Poshtive\Petak\Sources\Concerns\BuildsResults;

class CollectionSource implements DataSource
{
    use BuildsResults;

    public function __construct(protected Collection $rows) {}

    public function execute(GridDefinition $definition, GridRequest $request): GridResult
    {
        $rows = $this->rowsFor($definition, $request);

        $total = $rows->count();
        $pageRows = $rows
            ->forPage($request->page, $request->pageSize)
            ->values()
            ->map(fn (mixed $row) => $this->projectRow($row, $definition))
            ->all();

        return new GridResult(
            data: $pageRows,
            meta: $this->paginationMeta($request->page, $request->pageSize, $total, count($pageRows)),
        );
    }

    public function exportRows(GridDefinition $definition, GridRequest $request): iterable
    {
        return $this->rowsFor($definition, $request);
    }

    public function isLocal(): bool
    {
        return true;
    }

    private function rowsFor(GridDefinition $definition, GridRequest $request): Collection
    {
        $rows = $this->rows;

        if ($request->filters !== []) {
            $rows = $rows->filter(
                fn (mixed $row) => $this->matchesNodes($row, $definition, $request->filters),
            );
        }

        if ($request->search !== null && $request->search !== '') {
            $needle = mb_strtolower($request->search);
            $searchable = array_filter(
                $definition->columns,
                static fn ($column) => $column->isSearchable(),
            );

            $rows = $rows->filter(function (mixed $row) use ($needle, $searchable): bool {
                foreach ($searchable as $column) {
                    if (str_contains(mb_strtolower((string) data_get($row, $column->valuePath())), $needle)) {
                        return true;
                    }
                }

                return false;
            });
        }

        if ($request->sort !== []) {
            $rows = $rows->sort(function (mixed $left, mixed $right) use ($request, $definition): int {
                foreach ($request->sort as $item) {
                    $path = $definition->column($item['field'])->valuePath();
                    $comparison = data_get($left, $path) <=> data_get($right, $path);

                    if ($comparison !== 0) {
                        return $item['direction']->value === 'asc' ? $comparison : -$comparison;
                    }
                }

                return 0;
            });
        }

        return $rows;
    }

    private function matches(mixed $actual, string $operator, mixed $expected): bool
    {
        $actualString = mb_strtolower((string) $actual);
        $expectedString = mb_strtolower((string) $expected);

        return match ($operator) {
            'contains' => str_contains($actualString, $expectedString),
            'not_contains' => ! str_contains($actualString, $expectedString),
            'starts_with' => str_starts_with($actualString, $expectedString),
            'ends_with' => str_ends_with($actualString, $expectedString),
            'equals' => $actual == $expected,
            'not_equals' => $actual != $expected,
            'greater_than' => $actual > $expected,
            'greater_or_equal' => $actual >= $expected,
            'less_than' => $actual < $expected,
            'less_or_equal' => $actual <= $expected,
            'between' => $actual >= $expected[0] && $actual <= $expected[1],
            'not_between' => $actual < $expected[0] || $actual > $expected[1],
            'is_empty' => $actual === null || $actual === '',
            'is_not_empty' => $actual !== null && $actual !== '',
        };
    }

    private function matchesNodes(mixed $row, GridDefinition $definition, array $nodes): bool
    {
        foreach ($nodes as $item) {
            if (isset($item['filters'])) {
                $matches = array_map(
                    fn (array $node) => $this->matchesNodes($row, $definition, [$node]),
                    $item['filters'],
                );
                $groupMatches = $item['boolean'] === 'or'
                    ? in_array(true, $matches, true)
                    : ! in_array(false, $matches, true);

                if (! $groupMatches) {
                    return false;
                }

                continue;
            }

            $path = $definition->column($item['field'])->valuePath();

            if (! $this->matches(data_get($row, $path), $item['operator'], $item['value'])) {
                return false;
            }
        }

        return true;
    }
}
