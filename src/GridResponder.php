<?php

namespace Poshtive\Petak;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Poshtive\Petak\Actions\ActionResponder;
use Symfony\Component\HttpFoundation\Response;

/**
 * Handles HTTP dispatch for a grid: data requests, action mutations, and view rendering.
 */
final class GridResponder
{
    public function __construct(
        private readonly GridBuilder $builder,
    ) {}

    public function handle(Request $request, string|Closure $view, array $data = []): Response|View
    {
        if ($this->matchesAction($request)) {
            return $this->actionResponse($request);
        }

        if ($this->matches($request)) {
            return $this->builder->response($request);
        }

        if ($view instanceof Closure) {
            return $view($this->builder, $data);
        }

        return view($view, ['grid' => $this->builder, ...$data]);
    }

    public function matches(Request $request): bool
    {
        return $request->header('X-Petak-Request') === $this->builder->getName()
            || $request->query('petak') === $this->builder->getName();
    }

    private function matchesAction(Request $request): bool
    {
        return $request->input('petak_action.grid') === $this->builder->getName();
    }

    private function actionResponse(Request $request): Response
    {
        return (new ActionResponder(
            definition: $this->builder->definition(),
            bulkActions: $this->builder->getBulkActions(),
            exports: $this->builder->getExports(),
            config: $this->builder->getConfig(),
        ))->respond($request);
    }
}
