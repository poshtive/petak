<?php

namespace Poshtive\Petak;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Poshtive\Petak\Enums\SortDirection;

final readonly class GridRequest
{
    /**
     * @param  list<array{field: string, direction: SortDirection}>  $sort
     * @param  list<array{field: string, operator: string, value: mixed}>  $filters
     */
    public function __construct(
        public int $page,
        public int $pageSize,
        public array $sort,
        public array $filters,
        public ?string $search = null,
    ) {}

    public static function fromHttp(Request $request, GridDefinition $definition): self
    {
        $payload = $request->input('petak_request');

        if (is_string($payload)) {
            $payload = json_decode($payload, true);
        }

        $payload = is_array($payload) ? $payload : $request->all();

        if (($payload['version'] ?? '1') !== '1') {
            throw ValidationException::withMessages(['version' => 'Unsupported Petak protocol version.']);
        }

        if (isset($payload['grid']) && $payload['grid'] !== $definition->name) {
            throw ValidationException::withMessages(['grid' => 'Grid name does not match this definition.']);
        }

        $page = max(1, (int) data_get($payload, 'page.number', 1));
        $pageSize = (int) data_get($payload, 'page.size', $definition->defaultPageSize);

        if ($pageSize < 1 || $pageSize > $definition->maxPageSize) {
            throw ValidationException::withMessages([
                'page.size' => "Page size must be between 1 and {$definition->maxPageSize}.",
            ]);
        }

        $requestedSort = (array) ($payload['sort'] ?? []);
        $requestedSort = $requestedSort === [] ? $definition->defaultSort : $requestedSort;

        $sort = [];
        foreach ($requestedSort as $item) {
            $field = (string) ($item['field'] ?? '');
            $column = $definition->column($field);
            $direction = SortDirection::tryFrom((string) ($item['direction'] ?? ''));

            if (! $column?->isSortable() || $direction === null) {
                throw ValidationException::withMessages(['sort' => "Sort [{$field}] is not allowed."]);
            }

            $sort[] = compact('field', 'direction');
        }

        $rawFilters = (array) ($payload['filters'] ?? []);
        if (count($rawFilters, COUNT_RECURSIVE) > (int) config('petak.max_filters', 20) * 5) {
            throw ValidationException::withMessages(['filters' => 'Too many filters.']);
        }

        $filters = self::normalizeFilters($rawFilters, $definition);

        $search = self::normalizeSearch(data_get($payload, 'search.value'));

        return new self(
            page: $page,
            pageSize: $pageSize,
            sort: $sort,
            filters: $filters,
            search: $search,
        );
    }

    private static function normalizeFilters(
        array $items,
        GridDefinition $definition,
        int $depth = 1,
    ): array {
        if ($depth > (int) config('petak.max_filter_depth', 3)) {
            throw ValidationException::withMessages(['filters' => 'Filter group depth exceeded.']);
        }

        $filters = [];

        foreach ($items as $item) {
            if (isset($item['filters'])) {
                $boolean = strtolower((string) ($item['boolean'] ?? 'and'));

                if (! in_array($boolean, ['and', 'or'], true)) {
                    throw ValidationException::withMessages(['filters' => 'Invalid filter group boolean.']);
                }

                $filters[] = [
                    'boolean' => $boolean,
                    'filters' => self::normalizeFilters(
                        (array) $item['filters'],
                        $definition,
                        $depth + 1,
                    ),
                ];

                continue;
            }

            $field = (string) ($item['field'] ?? '');
            $operator = (string) ($item['operator'] ?? '');
            $filter = $definition->column($field)?->filterDefinition();

            if ($filter === null) {
                throw ValidationException::withMessages(['filters' => "Filter [{$field}] is not allowed."]);
            }

            $filters[] = [
                'field' => $field,
                'operator' => $operator,
                'value' => $filter->normalize($operator, $item['value'] ?? null),
            ];
        }

        return $filters;
    }

    private static function normalizeSearch(mixed $search): ?string
    {
        if (! is_scalar($search)) {
            return null;
        }

        $search = (string) $search;
        $maxLength = (int) config('petak.max_search_length', 100);

        if ($maxLength > 0 && mb_strlen($search) > $maxLength) {
            throw ValidationException::withMessages([
                'search' => "Search must not be longer than {$maxLength} characters.",
            ]);
        }

        return $search;
    }

    public static function fromBlade(Request $request, GridDefinition $definition): self
    {
        $state = $request->input("petak_state.{$definition->name}", []);
        $state = is_array($state) ? $state : [];
        $filters = [];

        foreach ((array) ($state['filters'] ?? []) as $field => $value) {
            if ($value === '' || $value === null) {
                continue;
            }

            $column = $definition->column((string) $field);
            $filter = $column?->filterDefinition();

            if ($filter === null) {
                throw ValidationException::withMessages([
                    'filters' => "Filter [{$field}] is not allowed.",
                ]);
            }

            $operator = (string) data_get(
                $state,
                "operators.{$field}",
                $filter->defaultOperator(),
            );

            $filters[] = [
                'field' => (string) $field,
                'operator' => $operator,
                'value' => $filter->normalize($operator, $value),
            ];
        }

        $sort = [];
        $sortField = (string) ($state['sort'] ?? '');
        $direction = SortDirection::tryFrom((string) ($state['direction'] ?? 'asc'));

        if ($sortField !== '') {
            $column = $definition->column($sortField);

            if (! $column?->isSortable() || $direction === null) {
                throw ValidationException::withMessages([
                    'sort' => "Sort [{$sortField}] is not allowed.",
                ]);
            }

            $sort[] = ['field' => $sortField, 'direction' => $direction];
        } elseif ($definition->defaultSort !== []) {
            foreach ($definition->defaultSort as $item) {
                $sort[] = [
                    'field' => $item['field'],
                    'direction' => SortDirection::from($item['direction']),
                ];
            }
        }

        $pageSize = (int) ($state['size'] ?? $definition->defaultPageSize);

        if ($pageSize < 1 || $pageSize > $definition->maxPageSize) {
            throw ValidationException::withMessages([
                'page.size' => "Page size must be between 1 and {$definition->maxPageSize}.",
            ]);
        }

        return new self(
            page: max(1, (int) ($state['page'] ?? 1)),
            pageSize: $pageSize,
            sort: $sort,
            filters: $filters,
            search: self::normalizeSearch($state['search'] ?? null),
        );
    }
}
