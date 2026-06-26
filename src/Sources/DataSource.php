<?php

namespace Poshtive\Petak\Sources;

use Poshtive\Petak\GridDefinition;
use Poshtive\Petak\GridRequest;
use Poshtive\Petak\GridResult;

interface DataSource
{
    public function execute(GridDefinition $definition, GridRequest $request): GridResult;

    /** @return iterable<mixed> */
    public function exportRows(GridDefinition $definition, GridRequest $request): iterable;

    public function isLocal(): bool;
}
