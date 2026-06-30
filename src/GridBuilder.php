<?php

namespace Poshtive\Petak;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use LogicException;
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

    private bool $preload;

    private ?string $responsiveLayout;

    private bool $responsiveCollapseStartOpen;

    /** @var array<string, mixed> */
    private array $rendererOptions = [];

    private ?GridState $state = null;

    /** @var array<string, BulkAction> */
    private array $bulkActions = [];

    /** @var array<string, CsvExport|XlsxExport> */
    private array $exports = [];

    private ?GridDefinition $definition = null;

    private ?GridResponder $responder = null;

    private ?GridSchema $schema = null;

    public function __construct(
        private readonly SourceFactory $sourceFactory,
        private readonly GridEngine $engine,
        private readonly PetakConfig $config,
    ) {
        $this->defaultPageSize = $config->defaultPageSize;
        $this->maxPageSize = $config->maxPageSize;
        $this->pageSizes = $config->pageSizes;
        $this->density = $config->density;
        $this->striped = $config->striped;
        $this->bordered = $config->bordered;
        $this->theme = $config->theme;
        $this->preload = $config->preload;
        $this->responsiveLayout = $config->responsiveLayout;
        $this->responsiveCollapseStartOpen = $config->responsiveCollapseStartOpen;
        $this->rendererOptions = $this->configuredRendererOptions();
        $this->verticalAlign = $config->verticalAlign;
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

    public function preload(bool $enabled = true): self
    {
        $this->preload = $enabled;
        $this->forgetDefinition();

        return $this;
    }

    public function responsiveLayout(?string $layout, ?bool $collapseStartOpen = null): self
    {
        if ($layout !== null && ! in_array($layout, ['hide', 'collapse'], true)) {
            throw new \InvalidArgumentException('Grid responsive layout must be hide, collapse, or null.');
        }

        $this->responsiveLayout = $layout;

        if ($collapseStartOpen !== null) {
            $this->responsiveCollapseStartOpen = $collapseStartOpen;
        }

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
            preload: $this->preload,
            responsive: [
                'layout' => $this->responsiveLayout,
                'collapse_start_open' => $this->responsiveCollapseStartOpen,
            ],
            rendererOptions: $this->rendererOptions,
        );
    }

    /** @return array<string, mixed> */
    private function configuredRendererOptions(): array
    {
        return [
            'native' => [
                'sticky' => [
                    'max_frozen_width_ratio' => $this->config->stickyMaxFrozenWidthRatio,
                    'disable_below' => $this->config->stickyDisableBelow,
                ],
            ],
        ];
    }

    public function matches(Request $request): bool
    {
        return $this->responder()->matches($request);
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
        return $this->responder()->handle($request, $view, $data);
    }

    /** @return array<string, mixed> */
    public function configuration(?string $endpoint = null): array
    {
        return $this->schema()->build($endpoint);
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function hasGlobalSearch(): bool
    {
        return $this->globalSearch;
    }

    public function getState(): ?GridState
    {
        return $this->state;
    }

    /** @return array<string, BulkAction> */
    public function getBulkActions(): array
    {
        return $this->bulkActions;
    }

    /** @return array<string, CsvExport|XlsxExport> */
    public function getExports(): array
    {
        return $this->exports;
    }

    public function defaultRenderer(): string
    {
        return $this->config->defaultRenderer;
    }

    public function maxLocalRows(): int
    {
        return $this->config->maxLocalRows;
    }

    public function getConfig(): PetakConfig
    {
        return $this->config;
    }

    private function responder(): GridResponder
    {
        return $this->responder ??= new GridResponder($this);
    }

    private function schema(): GridSchema
    {
        return $this->schema ??= new GridSchema($this, $this->engine);
    }

    private function forgetDefinition(): void
    {
        $this->definition = null;
    }
}
