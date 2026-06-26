<?php

namespace Poshtive\Petak\Actions;

final readonly class Selection
{
    /** @param list<int|string> $keys */
    public function __construct(
        private array $keys,
        public string $mode = 'selected',
        public array $request = [],
    ) {}

    /** @return list<int|string> */
    public function keys(): array
    {
        return $this->keys;
    }
}
