<?php

namespace Poshtive\Petak\Sources;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Poshtive\Petak\Concerns\EscapesLike;
use Poshtive\Petak\GridDefinition;
use Poshtive\Petak\GridRequest;
use Poshtive\Petak\GridResult;
use Poshtive\Petak\Sources\Concerns\BuildsResults;

abstract class DatabaseSource implements DataSource
{
    use BuildsResults;
    use EscapesLike;

    public function __construct(protected EloquentBuilder|QueryBuilder $query) {}

    public function execute(GridDefinition $definition, GridRequest $request): GridResult
    {
        $query = $this->queryFor($definition, $request);

        $paginator = $query->paginate(perPage: $request->pageSize, page: $request->page);

        $rows = array_map(
            fn (mixed $row) => $this->projectRow($row, $definition),
            $paginator->items(),
        );

        return new GridResult(
            data: $rows,
            meta: $this->paginationMeta(
                $paginator->currentPage(),
                $paginator->perPage(),
                $paginator->total(),
                count($rows),
            ),
        );
    }

    public function exportRows(GridDefinition $definition, GridRequest $request): iterable
    {
        foreach ($this->queryFor($definition, $request)->cursor() as $row) {
            yield $row;
        }
    }

    public function isLocal(): bool
    {
        return false;
    }

    private function queryFor(
        GridDefinition $definition,
        GridRequest $request,
    ): EloquentBuilder|QueryBuilder {
        $query = clone $this->query;

        $this->applyFilterNodes($query, $definition, $request->filters);

        if ($request->search !== null && $request->search !== '') {
            $query->where(function (EloquentBuilder|QueryBuilder $search) use ($definition, $request): void {
                foreach ($definition->columns as $column) {
                    if ($column->isSearchable()) {
                        $this->applyLike(
                            $search,
                            $column->filterField(),
                            'like',
                            '%'.$this->escapeLike($request->search).'%',
                            'or',
                        );
                    }
                }
            });
        }

        foreach ($request->sort as $item) {
            $column = $definition->column($item['field']);
            $resolver = $column->sortResolver();

            if ($resolver !== null) {
                $resolver($query, $item['direction']);
            } else {
                $query->orderBy($column->sortField(), $item['direction']->value);
            }
        }

        return $query;
    }

    private function applyFilterNodes(
        EloquentBuilder|QueryBuilder $query,
        GridDefinition $definition,
        array $nodes,
        string $boolean = 'and',
    ): void {
        foreach ($nodes as $item) {
            $method = $boolean === 'or' ? 'orWhere' : 'where';

            if (isset($item['filters'])) {
                $query->{$method}(function ($nested) use ($definition, $item): void {
                    $this->applyFilterNodes(
                        $nested,
                        $definition,
                        $item['filters'],
                        $item['boolean'],
                    );
                });

                continue;
            }

            $column = $definition->column($item['field']);
            $resolver = $column->filterResolver();
            $filter = $column->filterDefinition();

            $query->{$method}(function ($nested) use ($resolver, $column, $filter, $item): void {
                if ($resolver !== null) {
                    $resolver($nested, $item['operator'], $item['value']);
                } else {
                    $filter->applyDatabase(
                        $nested,
                        $column->filterField(),
                        $item['operator'],
                        $item['value'],
                    );
                }
            });
        }
    }
}
