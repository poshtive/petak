<?php

namespace Poshtive\Petak\Sources;

use Illuminate\Support\Collection;

final class ArraySource extends CollectionSource
{
    public function __construct(array $rows)
    {
        parent::__construct(new Collection($rows));
    }
}
