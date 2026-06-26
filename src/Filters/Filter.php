<?php

namespace Poshtive\Petak\Filters;

use Illuminate\Validation\ValidationException;

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
