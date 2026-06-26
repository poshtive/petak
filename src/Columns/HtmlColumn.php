<?php

namespace Poshtive\Petak\Columns;

use Closure;

final class HtmlColumn extends ComputedColumn
{
    public function __construct(string $key)
    {
        parent::__construct($key);

        $this->trustedHtml();
    }

    public function renderUsing(Closure $renderer): static
    {
        return $this->computeUsing($renderer);
    }
}
