<?php

namespace Poshtive\Petak;

abstract class Grid
{
    abstract public function configure(GridBuilder $grid): void;
}
