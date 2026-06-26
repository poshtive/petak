<?php

namespace Poshtive\Petak;

final class GridEngine
{
    public function execute(GridDefinition $definition, GridRequest $request): GridResult
    {
        return $definition->source->execute($definition, $request);
    }
}
