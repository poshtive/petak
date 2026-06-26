<?php

namespace Poshtive\Petak\Facades;

use Illuminate\Support\Facades\Facade;
use Poshtive\Petak\PetakManager;

/**
 * @method static \Poshtive\Petak\GridBuilder grid(string|\Poshtive\Petak\Grid|null $grid = null)
 * @method static \Poshtive\Petak\GridBuilder for(mixed $source)
 * @method static \Poshtive\Petak\GridPage page()
 * @method static void define(string $name, \Closure $factory)
 * @method static \Poshtive\Petak\GridBuilder get(string $name)
 *
 * @see PetakManager
 */
final class Petak extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'petak';
    }
}
