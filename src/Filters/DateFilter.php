<?php

namespace Poshtive\Petak\Filters;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;
use Throwable;

final class DateFilter extends Filter
{
    protected string $defaultOperator = 'equals';

    protected array $operators = [
        'equals', 'not_equals', 'greater_than', 'greater_or_equal',
        'less_than', 'less_or_equal', 'between', 'not_between',
    ];

    protected string $inputType = 'date';

    public static function make(): self
    {
        return new self;
    }

    public static function type(): string
    {
        return 'date';
    }

    protected function normalizeValue(string $operator, mixed $value): string|array
    {
        if (in_array($operator, ['between', 'not_between'], true)) {
            return array_map($this->normalizeDate(...), $this->normalizeRange($value));
        }

        return $this->normalizeDate($value);
    }

    private function normalizeDate(mixed $value): string
    {
        try {
            return CarbonImmutable::parse((string) $value)->toDateString();
        } catch (Throwable) {
            throw ValidationException::withMessages(['filters' => 'Date filter value is invalid.']);
        }
    }
}
