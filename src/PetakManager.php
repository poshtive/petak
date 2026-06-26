<?php

namespace Poshtive\Petak;

use Closure;
use InvalidArgumentException;

final class PetakManager
{
    /** @var array<string, Closure> */
    private array $definitions = [];

    public function __construct(
        private readonly SourceFactory $sourceFactory,
        private readonly GridEngine $engine,
    ) {}

    public function for(mixed $source): GridBuilder
    {
        return new GridBuilder($source, $this->sourceFactory, $this->engine);
    }

    public function define(string $name, Closure $factory): void
    {
        $this->definitions[$name] = $factory;
    }

    public function get(string $name): GridBuilder
    {
        $factory = $this->definitions[$name] ?? null;

        if ($factory === null) {
            throw new InvalidArgumentException("Petak grid [{$name}] is not defined.");
        }

        $grid = $factory();

        if (! $grid instanceof GridBuilder) {
            throw new InvalidArgumentException("Petak grid factory [{$name}] must return a GridBuilder.");
        }

        return $grid->name($name);
    }
}
