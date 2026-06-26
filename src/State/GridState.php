<?php

namespace Poshtive\Petak\State;

final readonly class GridState
{
    public function __construct(
        public string $key,
        public string $store = 'local-storage',
        public int $version = 1,
    ) {}

    public static function make(string $key): self
    {
        return new self($key);
    }

    public function store(string $store): self
    {
        return new self($this->key, $store, $this->version);
    }

    public function version(int $version): self
    {
        return new self($this->key, $this->store, $version);
    }

    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'store' => $this->store,
            'version' => $this->version,
        ];
    }
}
