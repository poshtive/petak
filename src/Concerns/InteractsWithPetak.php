<?php

namespace Poshtive\Petak\Concerns;

use Poshtive\Petak\GridBuilder;

trait InteractsWithPetak
{
    /** @param  array<string, mixed>  $request */
    public function loadPetak(array $request): array
    {
        $name = (string) ($request['grid'] ?? '');

        return $this->petakGrid($name)->execute($request)->toArray();
    }

    abstract protected function petakGrid(string $name): GridBuilder;
}
