<?php

namespace Poshtive\Petak\Concerns;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * LIKE-clause escaping and raw binding for filters and database sources.
 */
trait EscapesLike
{
    protected function escapeLike(mixed $value): string
    {
        return addcslashes((string) $value, '%_\\\\');
    }

    protected function applyLike(
        EloquentBuilder|QueryBuilder $query,
        string $field,
        string $operator,
        string $value,
        string $boolean = 'and',
    ): void {
        $builder = $query instanceof EloquentBuilder ? $query->getQuery() : $query;
        $wrapped = $builder->getGrammar()->wrap($field);

        $query->whereRaw(
            "{$wrapped} {$operator} ? escape '\\'",
            [$value],
            $boolean,
        );
    }
}
