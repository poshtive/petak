<?php

namespace Poshtive\Petak\Exports;

use Closure;
use Poshtive\Petak\Column;

final class XlsxExport
{
    private const WRITER_CLASS = 'OpenSpout\\Writer\\XLSX\\Writer';

    private const ROW_CLASS = 'OpenSpout\\Common\\Entity\\Row';

    private string $label = 'Excel';

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
        return class_exists(self::WRITER_CLASS)
            && class_exists(self::ROW_CLASS);
    }

    public function name(): string
    {
        return 'xlsx';
    }

    public function extension(): string
    {
        return 'xlsx';
    }

    public function mime(): string
    {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    /**
     * @param  iterable<mixed>  $rows
     * @param  array<string, Column>  $columns
     */
    public function write(iterable $rows, array $columns): void
    {
        if (! $this->available()) {
            throw new \RuntimeException('XLSX export requires openspout/openspout.');
        }

        $writerClass = self::WRITER_CLASS;
        $rowClass = self::ROW_CLASS;

        $writer = new $writerClass;
        $writer->openToFile('php://output');

        $writer->addRow($rowClass::fromValues(array_map(
            static fn (Column $column) => $column->toArray()['label'],
            $columns,
        )));

        foreach ($rows as $row) {
            $writer->addRow($rowClass::fromValues(array_map(
                static fn (Column $column) => strip_tags((string) $column->resolveExportValue($row)),
                $columns,
            )));
        }

        $writer->close();
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
