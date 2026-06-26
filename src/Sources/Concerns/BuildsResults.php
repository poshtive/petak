<?php

namespace Poshtive\Petak\Sources\Concerns;

use Poshtive\Petak\GridDefinition;

trait BuildsResults
{
    /** @return array<string, mixed> */
    private function projectRow(mixed $row, GridDefinition $definition): array
    {
        $result = [];

        foreach ($definition->columns as $column) {
            $result[$column->key()] = $column->resolveValue($row);
        }

        return $result;
    }

    /** @return array<string, mixed> */
    private function paginationMeta(int $page, int $perPage, int $total, int $count): array
    {
        $lastPage = max(1, (int) ceil($total / $perPage));
        $from = $count === 0 ? null : (($page - 1) * $perPage) + 1;

        return [
            'pagination' => [
                'mode' => 'page',
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => $lastPage,
                'from' => $from,
                'to' => $from === null ? null : $from + $count - 1,
            ],
        ];
    }
}
