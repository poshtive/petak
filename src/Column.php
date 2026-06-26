<?php

namespace Poshtive\Petak;

use Closure;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Str;
use Poshtive\Petak\Filters\BooleanFilter;
use Poshtive\Petak\Filters\DateFilter;
use Poshtive\Petak\Filters\Filter;
use Poshtive\Petak\Filters\NumberFilter;
use Poshtive\Petak\Filters\TextFilter;

/** @phpstan-consistent-constructor */
class Column
{
    private string $label;

    private string $value;

    private string $sortBy;

    private string $filterBy;

    private string $type = 'text';

    private bool $sortable = false;

    private ?Filter $filter = null;

    private bool $searchable = false;

    private bool $trustedHtml = false;

    private ?Closure $valueResolver = null;

    private ?Closure $filterResolver = null;

    private ?Closure $sortResolver = null;

    private ?Closure $exportResolver = null;

    private ?Closure $editResolver = null;

    private bool $visible = true;

    private bool $exportable = true;

    private string $align = 'start';

    private ?string $verticalAlign = null;

    private int $responsivePriority = 0;

    private bool $fitContent = false;

    public function __construct(private readonly string $key)
    {
        $this->label = Str::of($key)->afterLast('.')->replace('_', ' ')->headline()->toString();
        $this->value = $key;
        $this->sortBy = $key;
        $this->filterBy = $key;

        if ($key === 'id' || Str::endsWith($key, '_id')) {
            $this->label = Str::upper(Str::of($key)->replace('_', ' ')->toString());
            $this->integer();
            $this->fitContent();
        } elseif (Str::startsWith($key, ['is_', 'has_'])) {
            $this->boolean();
        } elseif (Str::endsWith($key, ['_at', '_date', '_on'])) {
            $this->date();
        }
    }

    public static function make(string $key): static
    {
        return new static($key);
    }

    public function label(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function value(string $path): static
    {
        $this->value = $path;

        return $this;
    }

    public function sortBy(string $field): static
    {
        $this->sortBy = $field;

        return $this;
    }

    public function filterBy(string $field): static
    {
        $this->filterBy = $field;

        return $this;
    }

    public function sortable(bool $enabled = true): static
    {
        $this->sortable = $enabled;

        return $this;
    }

    public function filterable(bool $enabled = true): static
    {
        $this->filter = $enabled ? $this->defaultFilter() : null;

        return $this;
    }

    public function filter(Filter $filter): static
    {
        $this->filter = $filter;

        return $this;
    }

    public function searchable(bool $enabled = true): static
    {
        $this->searchable = $enabled;

        return $this;
    }

    public function valueUsing(Closure $resolver): static
    {
        $this->valueResolver = $resolver;

        return $this;
    }

    public function filterUsing(Closure $resolver): static
    {
        $this->filterResolver = $resolver;

        return $this;
    }

    public function sortableUsing(Closure $resolver): static
    {
        $this->sortResolver = $resolver;
        $this->sortable = true;

        return $this;
    }

    public function exportUsing(Closure $resolver): static
    {
        $this->exportResolver = $resolver;

        return $this;
    }

    public function editableUsing(Closure $resolver): static
    {
        $this->editResolver = $resolver;

        return $this;
    }

    public function visible(bool $visible = true): static
    {
        $this->visible = $visible;

        return $this;
    }

    public function exportable(bool $exportable = true): static
    {
        $this->exportable = $exportable;

        return $this;
    }

    public function align(string $align): static
    {
        if (! in_array($align, ['start', 'center', 'end'], true)) {
            throw new \InvalidArgumentException('Column alignment must be start, center, or end.');
        }

        $this->align = $align;

        return $this;
    }

    public function verticalAlign(?string $align): static
    {
        if ($align !== null && ! in_array($align, ['top', 'middle', 'bottom'], true)) {
            throw new \InvalidArgumentException('Column vertical alignment must be top, middle, or bottom.');
        }

        $this->verticalAlign = $align;

        return $this;
    }

    public function responsivePriority(int $priority): static
    {
        $this->responsivePriority = max(0, $priority);

        return $this;
    }

    public function fitContent(bool $enabled = true): static
    {
        $this->fitContent = $enabled;

        return $this;
    }

    public function trustedHtml(bool $enabled = true): static
    {
        $this->trustedHtml = $enabled;

        return $this;
    }

    public function text(): static
    {
        $this->type = 'text';

        return $this;
    }

    public function integer(): static
    {
        $this->type = 'integer';
        $this->align = 'end';

        return $this;
    }

    public function number(): static
    {
        $this->type = 'number';
        $this->align = 'end';

        return $this;
    }

    public function boolean(): static
    {
        $this->type = 'boolean';
        $this->align = 'center';

        return $this;
    }

    public function date(): static
    {
        $this->type = 'date';

        return $this;
    }

    public function dateTime(): static
    {
        $this->type = 'datetime';

        return $this;
    }

    public function key(): string
    {
        return $this->key;
    }

    public function valuePath(): string
    {
        return $this->value;
    }

    public function sortField(): string
    {
        return $this->sortBy;
    }

    public function filterField(): string
    {
        return $this->filterBy;
    }

    public function isSortable(): bool
    {
        return $this->sortable;
    }

    public function filterDefinition(): ?Filter
    {
        return $this->filter;
    }

    public function filterResolver(): ?Closure
    {
        return $this->filterResolver;
    }

    public function sortResolver(): ?Closure
    {
        return $this->sortResolver;
    }

    public function editResolver(): ?Closure
    {
        return $this->editResolver;
    }

    public function isExportable(): bool
    {
        return $this->exportable;
    }

    public function resolveExportValue(mixed $row): mixed
    {
        if ($this->exportResolver !== null) {
            return ($this->exportResolver)($row);
        }

        $value = $this->resolveRawValue($row);

        return $value instanceof Htmlable ? '' : $value;
    }

    public function isSearchable(): bool
    {
        return $this->searchable;
    }

    public function isTrustedHtml(): bool
    {
        return $this->trustedHtml;
    }

    public function resolveValue(mixed $row): mixed
    {
        $value = $this->resolveRawValue($row);

        return $value instanceof Htmlable ? $value->toHtml() : $value;
    }

    private function resolveRawValue(mixed $row): mixed
    {
        return $this->valueResolver !== null
            ? ($this->valueResolver)($row)
            : data_get($row, $this->value);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'label' => $this->label,
            'value' => $this->value,
            'type' => $this->type,
            'sortable' => $this->sortable,
            'searchable' => $this->searchable,
            'trusted_html' => $this->trustedHtml,
            'visible' => $this->visible,
            'exportable' => $this->exportable,
            'editable' => $this->editResolver !== null,
            'align' => $this->align,
            'vertical_align' => $this->verticalAlign,
            'responsive_priority' => $this->responsivePriority,
            'fit_content' => $this->fitContent,
            'filter' => $this->filter?->toArray(),
        ];
    }

    private function defaultFilter(): Filter
    {
        return match ($this->type) {
            'integer', 'number' => NumberFilter::make(),
            'boolean' => BooleanFilter::make(),
            'date', 'datetime' => DateFilter::make(),
            default => TextFilter::make(),
        };
    }
}
