<?php

namespace Poshtive\Petak\Filters;

use Illuminate\Validation\ValidationException;

final class NumberFilter extends Filter
{
    protected string $defaultOperator = 'equals';

    protected array $operators = [
        'equals', 'not_equals', 'greater_than', 'greater_or_equal',
        'less_than', 'less_or_equal', 'between', 'not_between',
    ];

    public static function make(): self
    {
        return new self;
    }

    public static function type(): string
    {
        return 'number';
    }

    protected function normalizeValue(string $operator, mixed $value): int|float|array
    {
        if (in_array($operator, ['between', 'not_between'], true)) {
            return array_map($this->normalizeNumber(...), $this->normalizeRange($value));
        }

        return $this->normalizeNumber($value);
    }

    private function normalizeNumber(mixed $value): int|float
    {
        if (! is_numeric($value)) {
            throw ValidationException::withMessages(['filters' => 'Number filter value must be numeric.']);
        }

        return filter_var($value, FILTER_VALIDATE_INT) !== false
            ? (int) $value
            : (float) $value;
    }
}
