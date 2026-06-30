<?php

namespace Poshtive\Petak;

use Closure;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

final class GridPage
{
    /** @var array<string, array{factory: Closure|GridBuilder|string|Grid, as: string}> */
    private array $grids = [];

    /** @var array<string, GridBuilder> */
    private array $resolved = [];

    public function __construct(
        private readonly Container $container,
        private readonly SourceFactory $sourceFactory,
        private readonly GridEngine $engine,
        private readonly PetakConfig $config,
    ) {}

    public function grid(
        string $name,
        Closure|GridBuilder|string|Grid $factory,
        ?string $as = null,
    ): self {
        $this->grids[$name] = [
            'factory' => $factory,
            'as' => $as ?? $name,
        ];
        unset($this->resolved[$name]);

        return $this;
    }

    public function handle(Request $request, string|Closure $view, array $data = []): Response|View
    {
        $actionGrid = $request->input('petak_action.grid');

        if (is_string($actionGrid)) {
            abort_unless(isset($this->grids[$actionGrid]), 422, 'Unknown Petak page grid action.');

            return $this->resolve($actionGrid)->handle($request, $view, $data);
        }

        foreach (array_keys($this->grids) as $name) {
            $grid = $this->resolve($name);

            if ($grid->matches($request)) {
                return $grid->response($request);
            }
        }

        if ($view instanceof Closure) {
            return $view($this, $this->viewData($data));
        }

        return view($view, $this->viewData($data));
    }

    /** @return array<string, GridBuilder> */
    public function builders(): array
    {
        $builders = [];

        foreach (array_keys($this->grids) as $name) {
            $builders[$this->grids[$name]['as']] = $this->resolve($name);
        }

        return $builders;
    }

    private function resolve(string $name): GridBuilder
    {
        if (isset($this->resolved[$name])) {
            return $this->resolved[$name];
        }

        $factory = $this->grids[$name]['factory'] ?? null;

        if ($factory instanceof GridBuilder) {
            return $this->resolved[$name] = $factory->name($name);
        }

        if ($factory instanceof Grid) {
            return $this->resolved[$name] = $this->fromGrid($factory)->name($name);
        }

        if (is_string($factory)) {
            $instance = $this->container->make($factory);

            if (! $instance instanceof Grid) {
                throw new InvalidArgumentException('Petak page grid classes must extend '.Grid::class.'.');
            }

            return $this->resolved[$name] = $this->fromGrid($instance)->name($name);
        }

        if ($factory instanceof Closure) {
            $builder = new GridBuilder($this->sourceFactory, $this->engine, $this->config);
            $configured = $this->container->call($factory, ['grid' => $builder]);

            if ($configured !== null && ! $configured instanceof GridBuilder) {
                throw new InvalidArgumentException(
                    "Petak page grid [{$name}] factory must return a GridBuilder or null.",
                );
            }

            return $this->resolved[$name] = ($configured ?? $builder)->name($name);
        }

        throw new InvalidArgumentException("Petak page grid [{$name}] is not configured.");
    }

    private function fromGrid(Grid $grid): GridBuilder
    {
        $builder = new GridBuilder($this->sourceFactory, $this->engine, $this->config);
        $this->container->call([$grid, 'configure'], ['grid' => $builder]);

        return $builder;
    }

    /** @param  array<string, mixed>  $data */
    private function viewData(array $data): array
    {
        return [...$this->builders(), ...$data];
    }
}
