<?php

namespace Poshtive\Petak\Columns;

use Closure;
use Poshtive\Petak\Column;

class ComputedColumn extends Column
{
    public function computeUsing(Closure $resolver): static
    {
        return $this->valueUsing($resolver);
    }
}
