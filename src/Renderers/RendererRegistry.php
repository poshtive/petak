<?php

namespace Poshtive\Petak\Renderers;

use InvalidArgumentException;

/**
 * Resolves grid renderer names to their Blade view partials.
 *
 * Renderers are pluggable: the package ships "native" and "blade", but
 * applications can register additional renderers (for example a Tabulator or
 * AG Grid adapter) and reference them by name from the grid component or
 * configuration.
 */
final class RendererRegistry
{
    /** @var array<string, string> */
    private array $views = [];

    public function register(string $name, string $view): void
    {
        $this->views[$name] = $view;
    }

    public function has(string $name): bool
    {
        return isset($this->views[$name]);
    }

    /**
     * Resolve a renderer name to its registered Blade view.
     *
     * @throws InvalidArgumentException when the renderer is not registered.
     */
    public function view(string $name): string
    {
        if (! isset($this->views[$name])) {
            throw new InvalidArgumentException("Petak renderer [{$name}] is not registered.");
        }

        return $this->views[$name];
    }

    /** @return list<string> */
    public function names(): array
    {
        return array_keys($this->views);
    }
}
