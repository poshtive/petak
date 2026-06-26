<?php

namespace Poshtive\Petak;

use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;

final readonly class GridResult implements Arrayable, JsonSerializable
{
    /**
     * @param  list<array<string, mixed>>  $data
     * @param  array<string, mixed>  $meta
     * @param  list<array<string, mixed>>  $errors
     */
    public function __construct(
        public array $data,
        public array $meta = [],
        public array $errors = [],
    ) {}

    public function toArray(): array
    {
        return [
            'version' => '1',
            'data' => $this->data,
            'meta' => $this->meta + ['aggregates' => []],
            'errors' => $this->errors,
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
