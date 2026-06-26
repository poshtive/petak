<?php

namespace Poshtive\Petak\Filters;

use Illuminate\Validation\ValidationException;

final class TextFilter extends Filter
{
    protected string $defaultOperator = 'contains';

    protected array $operators = [
        'contains', 'not_contains', 'starts_with', 'ends_with',
        'equals', 'not_equals', 'is_empty', 'is_not_empty',
    ];

    public static function make(): self
    {
        return new self;
    }

    public static function type(): string
    {
        return 'text';
    }

    protected function normalizeValue(string $operator, mixed $value): ?string
    {
        if (in_array($operator, ['is_empty', 'is_not_empty'], true)) {
            return null;
        }

        if (! is_scalar($value) && $value !== null) {
            throw ValidationException::withMessages(['filters' => 'Text filter value must be scalar.']);
        }

        return (string) $value;
    }
}
