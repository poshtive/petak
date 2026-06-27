<?php

namespace Poshtive\Petak\Columns;

use Closure;
use Poshtive\Petak\Column;

final class ActionColumn extends Column
{
    private string $view;

    private string $modelVariable = 'model';

    private array|Closure $viewData = [];

    public function __construct(string $key = 'action')
    {
        parent::__construct($key);

        $this
            ->label('Action')
            ->trustedHtml()
            ->exportable(false)
            ->align('end')
            ->responsivePriority(1);
    }

    public static function make(string $key = 'action'): static
    {
        return new self($key);
    }

    public function view(
        string $view,
        string $modelVariable = 'model',
        array|Closure $data = [],
    ): static {
        $this->view = $view;
        $this->modelVariable = $modelVariable;
        $this->viewData = $data;

        return $this->valueUsing(function (mixed $row) {
            $data = $this->viewData instanceof Closure
                ? ($this->viewData)($row)
                : $this->viewData;

            return view($this->view, [
                $this->modelVariable => $row,
                ...$data,
            ]);
        });
    }
}
