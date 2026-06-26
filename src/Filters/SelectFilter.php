<?php

namespace Poshtive\Petak\Filters;

use Illuminate\Validation\ValidationException;

final class SelectFilter extends Filter
{
    protected string $defaultOperator = 'equals';

    protected array $operators = ['equals', 'not_equals'];

    protected string $component = 'select';

    /**
     * @param  array<string, string>  $options
     */
    public function __construct(array $options = [])
    {
        $this->options = $options;
    }

    /** @param  array<string, string>  $options */
    public static function make(array $options = []): self
    {
        return new self($options);
    }

    public static function type(): string
    {
        return 'select';
    }

    protected function normalizeValue(string $operator, mixed $value): string
    {
        if (! is_scalar($value)) {
            throw ValidationException::withMessages(['filters' => 'Select filter value must be scalar.']);
        }

        $value = (string) $value;

        if ($this->options !== [] && ! array_key_exists($value, $this->options)) {
            throw ValidationException::withMessages(['filters' => 'Select filter value is not allowed.']);
        }

        return $value;
    }
}
