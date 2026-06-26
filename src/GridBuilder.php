<?php

namespace Poshtive\Petak;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use LogicException;
use Poshtive\Petak\Actions\ActionResponder;
use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Enums\GridMode;
use Poshtive\Petak\Exports\CsvExport;
use Poshtive\Petak\Exports\XlsxExport;
use Poshtive\Petak\State\GridState;
use Symfony\Component\HttpFoundation\Response;

final class GridBuilder
{
    private string $name = 'petak';

    private mixed $source = null;

    private bool $hasSource = false;

    /** @var array<string, Column> */
    private array $columns = [];

    private GridMode $mode = GridMode::Auto;

    private int $defaultPageSize;

    private int $maxPageSize;

    /** @var list<int> */
    private array $pageSizes;

    /** @var list<array{field: string, direction: string}> */
    private array $defaultSort = [];

    private bool $sortable = false;

    private bool $filterable = false;

    private bool $globalSearch = false;

    private string $paginationMode = 'page';

    private string $rowKey = 'id';

    private string $density = 'comfortable';

    private bool $striped = false;

    private bool $bordered = true;

    private ?string $theme = null;

    private string $verticalAlign = 'middle';

    private ?string $className = null;

    private ?GridState $state = null;

    /** @var array<string, BulkAction> */
    private array $bulkActions = [];

    /** @var array<string, CsvExport|XlsxExport> */
    private array $exports = [];

    private ?GridDefinition $definition = null;

    public function __construct(
        private readonly SourceFactory $sourceFactory,
        private readonly GridEngine $engine,
    ) {
        $this->defaultPageSize = (int) config('petak.default_page_size', 25);
        $this->maxPageSize = (int) config('petak.max_page_size', 250);
        $this->pageSizes = (array) config('petak.page_sizes', [10, 25, 50, 100]);
        $this->density = (string) config('petak.appearance.density', 'comfortable');
        $this->striped = (bool) config('petak.appearance.striped', false);
        $this->bordered = (bool) config('petak.appearance.bordered', true);
        $this->theme = config('petak.appearance.theme');
        $this->verticalAlign((string) config('petak.appearance.vertical_align', 'middle'));
    }

    public function source(mixed $source): self
    {
        $this->source = $source;
        $this->hasSource = true;
        $this->forgetDefinition();

        return $this;
    }

    public function name(string $name): self
    {
        $this->name = Str::slug($name);
        $this->forgetDefinition();

        return $this;
    }

    /** @param  array<int|string, Column|string>  $columns */
    public function columns(array $columns): self
    {
        foreach ($columns as $key => $value) {
            if ($value instanceof Column) {
                $column = $value;
            } elseif (is_int($key)) {
                $column = Column::make($value);
            } else {
                $column = Column::make($key)->label($value);
            }

            if ($this->sortable) {
                $column->sortable();
            }

            if ($this->filterable) {
                $column->filterable();
            }

            $this->columns[$column->key()] = $column;
        }

        $this->forgetDefinition();

        return $this;
    }

    public function sortable(bool $enabled = true): self
    {
        $this->sortable = $enabled;

        foreach ($this->columns as $column) {
            $column->sortable($enabled);
        }

        $this->forgetDefinition();

        return $this;
    }

    public function filterable(bool $enabled = true): self
    {
        $this->filterable = $enabled;

        foreach ($this->columns as $column) {
            $column->filterable($enabled);
        }

        $this->forgetDefinition();

        return $this;
    }

    public function globalSearch(bool $enabled = true): self
    {
        $this->globalSearch = $enabled;

        return $this;
    }

    public function state(GridState $state): self
    {
        $this->state = $state;

        return $this;
    }

    /** @param list<BulkAction> $actions */
    public function bulkActions(array $actions): self
    {
        foreach ($actions as $action) {
            $this->bulkActions[$action->name()] = $action;
        }

        return $this;
    }

    /** @param list<CsvExport|XlsxExport> $exports */
    public function exports(array $exports): self
    {
        foreach ($exports as $export) {
            $this->exports[$export->name()] = $export;
        }

        return $this;
    }

    public function mode(GridMode|string $mode): self
    {
        $this->mode = is_string($mode) ? GridMode::from($mode) : $mode;
        $this->forgetDefinition();

        return $this;
    }

    public function pagination(int $defaultPageSize = 25, int $maxPageSize = 250, array $pageSizes = []): self
    {
        $this->defaultPageSize = $defaultPageSize;
        $this->maxPageSize = $maxPageSize;
        $this->pageSizes = $pageSizes ?: $this->pageSizes;
        $this->forgetDefinition();

        return $this;
    }

    public function rowKey(string $key): self
    {
        $this->rowKey = $key;
        $this->forgetDefinition();

        return $this;
    }

    public function density(string $density): self
    {
        if (! in_array($density, ['compact', 'comfortable', 'spacious'], true)) {
            throw new \InvalidArgumentException('Grid density must be compact, comfortable, or spacious.');
        }

        $this->density = $density;
        $this->forgetDefinition();

        return $this;
    }

    public function striped(bool $enabled = true): self
    {
        $this->striped = $enabled;
        $this->forgetDefinition();

        return $this;
    }

    public function bordered(bool $enabled = true): self
    {
        $this->bordered = $enabled;
        $this->forgetDefinition();

        return $this;
    }

    public function theme(?string $theme): self
    {
        $this->theme = $theme;
        $this->forgetDefinition();

        return $this;
    }

    public function verticalAlign(string $align): self
    {
        if (! in_array($align, ['top', 'middle', 'bottom'], true)) {
            throw new \InvalidArgumentException('Grid vertical alignment must be top, middle, or bottom.');
        }

        $this->verticalAlign = $align;
        $this->forgetDefinition();

        return $this;
    }

    public function className(?string $className): self
    {
        $this->className = $className;
        $this->forgetDefinition();

        return $this;
    }

    /** @param  list<array{field: string, direction: string}>  $sort */
    public function defaultSort(array $sort): self
    {
        $this->defaultSort = $sort;
        $this->forgetDefinition();

        return $this;
    }

    public function definition(): GridDefinition
    {
        if ($this->definition !== null) {
            return $this->definition;
        }

        if (! $this->hasSource) {
            throw new LogicException('Petak grid source has not been configured.');
        }

        $source = $this->sourceFactory->make($this->source);
        $mode = $this->mode === GridMode::Auto
            ? ($source->isLocal() ? GridMode::Local : GridMode::Remote)
            : $this->mode;

        return $this->definition = new GridDefinition(
            name: $this->name,
            source: $source,
            columns: $this->columns,
            mode: $mode,
            defaultPageSize: $this->defaultPageSize,
            maxPageSize: $this->maxPageSize,
            pageSizes: $this->pageSizes,
            defaultSort: $this->defaultSort,
            paginationMode: $this->paginationMode,
            appearance: [
                'density' => $this->density,
                'striped' => $this->striped,
                'bordered' => $this->bordered,
                'theme' => $this->theme,
                'vertical_align' => $this->verticalAlign,
            ],
            className: $this->className,
            rowKey: $this->rowKey,
        );
    }

    public function matches(Request $request): bool
    {
        return $request->header('X-Petak-Request') === $this->name
            || $request->query('petak') === $this->name;
    }

    public function response(?Request $request = null): JsonResponse
    {
        $request ??= request();
        $definition = $this->definition();
        $gridRequest = GridRequest::fromHttp($request, $definition);

        return response()->json($this->engine->execute($definition, $gridRequest));
    }

    public function bladeResult(?Request $request = null): GridResult
    {
        $request ??= request();
        $definition = $this->definition();

        return $this->engine->execute(
            $definition,
            GridRequest::fromBlade($request, $definition),
        );
    }

    /** @param  array<string, mixed>  $payload */
    public function execute(array $payload): GridResult
    {
        $definition = $this->definition();
        $request = Request::create('/', 'GET', $payload);

        return $this->engine->execute(
            $definition,
            GridRequest::fromHttp($request, $definition),
        );
    }

    public function handle(Request $request, string|Closure $view, array $data = []): Response|View
    {
        if ($this->matchesAction($request)) {
            return $this->actionResponse($request);
        }

        if ($this->matches($request)) {
            return $this->response($request);
        }

        if ($view instanceof Closure) {
            return $view($this, $data);
        }

        return view($view, ['grid' => $this, ...$data]);
    }

    /** @return array<string, mixed> */
    public function configuration(?string $endpoint = null): array
    {
        $definition = $this->definition();
        $configuration = $definition->schema() + [
            'endpoint' => $endpoint ?? url()->current(),
            'renderer' => config('petak.default_renderer', 'tabulator'),
            'global_search' => $this->globalSearch,
            'state' => $this->state?->toArray(),
            'bulk_actions' => array_values(array_map(
                static fn (BulkAction $action) => $action->toArray(),
                array_filter(
                    $this->bulkActions,
                    static fn (BulkAction $action) => $action->authorized(),
                ),
            )),
            'exports' => array_values(array_map(
                static fn (CsvExport|XlsxExport $export) => $export->toArray(),
                array_filter(
                    $this->exports,
                    static fn (CsvExport|XlsxExport $export) => $export->available(),
                ),
            )),
        ];

        if ($definition->mode === GridMode::Local) {
            $maxLocalRows = (int) config('petak.max_local_rows', 1000);
            $request = new GridRequest(
                page: 1,
                pageSize: $maxLocalRows > 0 ? $maxLocalRows + 1 : PHP_INT_MAX,
                sort: [],
                filters: [],
            );
            $initialResult = $this->engine->execute($definition, $request);
            $total = (int) data_get($initialResult->meta, 'pagination.total', count($initialResult->data));

            if ($maxLocalRows > 0 && $total > $maxLocalRows) {
                throw new \LengthException(
                    "Petak local mode is limited to {$maxLocalRows} rows. Use remote mode for larger datasets.",
                );
            }

            $configuration['initialResult'] = $initialResult->toArray();
        }

        return $configuration;
    }

    private function matchesAction(Request $request): bool
    {
        return $request->input('petak_action.grid') === $this->name;
    }

    private function actionResponse(Request $request): Response
    {
        return (new ActionResponder(
            definition: $this->definition(),
            bulkActions: $this->bulkActions,
            exports: $this->exports,
        ))->respond($request);
    }

    private function forgetDefinition(): void
    {
        $this->definition = null;
    }
}
