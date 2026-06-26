<?php

namespace Poshtive\Petak\Exports;

use Closure;

final class CsvExport
{
    private string $label = 'CSV';

    private ?Closure $authorization = null;

    public static function make(): self
    {
        return new self;
    }

    public function label(string $label): self
    {
        $this->label = $label;

        return $this;
    }

    public function authorize(Closure $authorization): self
    {
        $this->authorization = $authorization;

        return $this;
    }

    public function authorized(): bool
    {
        return $this->authorization === null || ($this->authorization)();
    }

    public function available(): bool
    {
        return true;
    }

    public function name(): string
    {
        return 'csv';
    }

    public function extension(): string
    {
        return 'csv';
    }

    public function mime(): string
    {
        return 'text/csv';
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name(),
            'label' => $this->label,
            'extension' => $this->extension(),
            'mime' => $this->mime(),
        ];
    }
}
