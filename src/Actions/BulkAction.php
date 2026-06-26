<?php

namespace Poshtive\Petak\Actions;

use Closure;

final class BulkAction
{
    private string $label;

    private Closure $handler;

    private ?Closure $authorization = null;

    public function __construct(private readonly string $name)
    {
        $this->label = $name;
    }

    public static function make(string $name): self
    {
        return new self($name);
    }

    public function label(string $label): self
    {
        $this->label = $label;

        return $this;
    }

    public function handle(Closure $handler): self
    {
        $this->handler = $handler;

        return $this;
    }

    public function authorize(Closure $authorization): self
    {
        $this->authorization = $authorization;

        return $this;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function run(Selection $selection): mixed
    {
        abort_unless(
            $this->authorization === null || ($this->authorization)(),
            403,
        );

        return ($this->handler)($selection);
    }

    public function toArray(): array
    {
        return ['name' => $this->name, 'label' => $this->label];
    }
}
