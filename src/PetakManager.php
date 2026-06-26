<?php

namespace Poshtive\Petak;

use Closure;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

final class PetakManager
{
    /** @var array<string, Closure> */
    private array $definitions = [];

    public function __construct(
        private readonly Container $container,
        private readonly SourceFactory $sourceFactory,
        private readonly GridEngine $engine,
    ) {}

    public function grid(string|Grid|null $grid = null): GridBuilder
    {
        $builder = new GridBuilder($this->sourceFactory, $this->engine);

        if ($grid === null) {
            return $builder;
        }

        $instance = is_string($grid) ? $this->container->make($grid) : $grid;

        if (! $instance instanceof Grid) {
            throw new InvalidArgumentException('Petak grid classes must extend '.Grid::class.'.');
        }

        $this->container->call([$instance, 'configure'], ['grid' => $builder]);

        return $builder;
    }

    public function for(mixed $source): GridBuilder
    {
        return $this->grid()->source($source);
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

        $grid = $this->grid();
        $configured = $this->container->call($factory, ['grid' => $grid]);

        if ($configured !== null && ! $configured instanceof GridBuilder) {
            throw new InvalidArgumentException(
                "Petak grid factory [{$name}] must return a GridBuilder or null.",
            );
        }

        return ($configured ?? $grid)->name($name);
    }
}
