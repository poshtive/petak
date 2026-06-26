<?php

namespace Poshtive\Petak;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Poshtive\Petak\Sources\ArraySource;
use Poshtive\Petak\Sources\CollectionSource;
use Poshtive\Petak\Sources\DataSource;
use Poshtive\Petak\Sources\EloquentSource;
use Poshtive\Petak\Sources\QueryBuilderSource;

final class SourceFactory
{
    public function make(mixed $source): DataSource
    {
        return match (true) {
            $source instanceof DataSource => $source,
            $source instanceof EloquentBuilder => new EloquentSource($source),
            $source instanceof QueryBuilder => new QueryBuilderSource($source),
            $source instanceof Collection => new CollectionSource($source),
            is_array($source) => new ArraySource($source),
            default => throw new InvalidArgumentException('Unsupported Petak data source.'),
        };
    }
}
