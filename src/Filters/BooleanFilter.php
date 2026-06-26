<?php

namespace Poshtive\Petak\Filters;

use Illuminate\Validation\ValidationException;

final class BooleanFilter extends Filter
{
    protected string $defaultOperator = 'equals';

    protected array $operators = ['equals', 'not_equals'];

    protected string $component = 'select';

    protected array $options = [
        'true' => 'Yes',
        'false' => 'No',
    ];

    public static function make(): self
    {
        return new self;
    }

    public static function type(): string
    {
        return 'boolean';
    }

    protected function normalizeValue(string $operator, mixed $value): bool
    {
        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        if ($normalized === null) {
            throw ValidationException::withMessages(['filters' => 'Boolean filter value is invalid.']);
        }

        return $normalized;
    }
}
