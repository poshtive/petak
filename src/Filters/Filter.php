<?php

namespace Poshtive\Petak\Filters;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

abstract class Filter
{
    protected string $defaultOperator;

    /** @var list<string> */
    protected array $operators = [];

    final public function normalize(string $operator, mixed $value): mixed
    {
        if (! in_array($operator, $this->operators, true)) {
            throw ValidationException::withMessages([
                'filters' => "Operator [{$operator}] is not valid for this filter.",
            ]);
        }

        return $this->normalizeValue($operator, $value);
    }

    public function defaultOperator(): string
    {
        return $this->defaultOperator;
    }

    /** @return list<string> */
    public function operators(): array
    {
        return $this->operators;
    }

    public function applyDatabase(
        EloquentBuilder|QueryBuilder $query,
        string $field,
        string $operator,
        mixed $value,
    ): void {
        match ($operator) {
            'contains' => $this->applyLike($query, $field, 'like', '%'.$this->escapeLike($value).'%'),
            'not_contains' => $this->applyLike($query, $field, 'not like', '%'.$this->escapeLike($value).'%'),
            'starts_with' => $this->applyLike($query, $field, 'like', $this->escapeLike($value).'%'),
            'ends_with' => $this->applyLike($query, $field, 'like', '%'.$this->escapeLike($value)),
            'equals' => $query->where($field, '=', $value),
            'not_equals' => $query->where($field, '!=', $value),
            'greater_than' => $query->where($field, '>', $value),
            'greater_or_equal' => $query->where($field, '>=', $value),
            'less_than' => $query->where($field, '<', $value),
            'less_or_equal' => $query->where($field, '<=', $value),
            'between' => $query->whereBetween($field, $value),
            'not_between' => $query->whereNotBetween($field, $value),
            'is_empty' => $query->where(fn ($nested) => $nested->whereNull($field)->orWhere($field, '')),
            'is_not_empty' => $query->whereNotNull($field)->where($field, '!=', ''),
            default => throw new InvalidArgumentException("Operator [{$operator}] is not supported by this filter."),
        };
    }

    public function matches(mixed $actual, string $operator, mixed $expected): bool
    {
        $actualString = mb_strtolower((string) $actual);
        $expectedString = mb_strtolower((string) $expected);

        return match ($operator) {
            'contains' => str_contains($actualString, $expectedString),
            'not_contains' => ! str_contains($actualString, $expectedString),
            'starts_with' => str_starts_with($actualString, $expectedString),
            'ends_with' => str_ends_with($actualString, $expectedString),
            'equals' => $actual == $expected,
            'not_equals' => $actual != $expected,
            'greater_than' => $actual > $expected,
            'greater_or_equal' => $actual >= $expected,
            'less_than' => $actual < $expected,
            'less_or_equal' => $actual <= $expected,
            'between' => $actual >= $expected[0] && $actual <= $expected[1],
            'not_between' => $actual < $expected[0] || $actual > $expected[1],
            'is_empty' => $actual === null || $actual === '',
            'is_not_empty' => $actual !== null && $actual !== '',
            default => throw new InvalidArgumentException("Operator [{$operator}] is not supported by this filter."),
        };
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'type' => static::type(),
            'operator' => $this->defaultOperator,
            'operators' => $this->operators,
        ];
    }

    abstract public static function type(): string;

    abstract protected function normalizeValue(string $operator, mixed $value): mixed;

    protected function escapeLike(mixed $value): string
    {
        return addcslashes((string) $value, '%_\\');
    }

    protected function applyLike(
        EloquentBuilder|QueryBuilder $query,
        string $field,
        string $operator,
        string $value,
        string $boolean = 'and',
    ): void {
        $builder = $query instanceof EloquentBuilder ? $query->getQuery() : $query;
        $wrapped = $builder->getGrammar()->wrap($field);

        $query->whereRaw(
            "{$wrapped} {$operator} ? escape '\\'",
            [$value],
            $boolean,
        );
    }

    protected function normalizeRange(mixed $value): array
    {
        if (! is_array($value)) {
            throw ValidationException::withMessages([
                'filters' => 'Range filter value must be an object with from and to values.',
            ]);
        }

        $from = $value['from'] ?? $value[0] ?? null;
        $to = $value['to'] ?? $value[1] ?? null;

        if ($from === null || $to === null) {
            throw ValidationException::withMessages([
                'filters' => 'Range filter requires both from and to values.',
            ]);
        }

        return [$from, $to];
    }
}
