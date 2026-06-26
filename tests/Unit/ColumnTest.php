<?php

namespace Poshtive\Petak\Tests\Unit;

use Illuminate\Validation\ValidationException;
use Poshtive\Petak\Column;
use Poshtive\Petak\Columns\ActionColumn;
use Poshtive\Petak\Filters\BooleanFilter;
use Poshtive\Petak\Filters\DateFilter;
use Poshtive\Petak\Filters\NumberFilter;
use Poshtive\Petak\Tests\TestCase;

class ColumnTest extends TestCase
{
    public function test_column_infers_label_type_and_default_filter(): void
    {
        $id = Column::make('user_id')->filterable()->toArray();
        $active = Column::make('is_active')->filterable()->toArray();
        $date = Column::make('created_at')->filterable()->toArray();

        $this->assertSame('USER ID', $id['label']);
        $this->assertSame(NumberFilter::type(), $id['filter']['type']);
        $this->assertSame('end', $id['align']);
        $this->assertTrue($id['fit_content']);
        $this->assertSame(BooleanFilter::type(), $active['filter']['type']);
        $this->assertSame('center', $active['align']);
        $this->assertSame(DateFilter::type(), $date['filter']['type']);
    }

    public function test_fit_content_can_be_configured_and_is_enabled_for_actions(): void
    {
        $column = Column::make('reference')->fitContent()->toArray();
        $regular = Column::make('name')->toArray();
        $action = ActionColumn::make()->toArray();

        $this->assertTrue($column['fit_content']);
        $this->assertFalse($regular['fit_content']);
        $this->assertTrue($action['fit_content']);
        $this->assertFalse(Column::make('id')->fitContent(false)->toArray()['fit_content']);
    }

    public function test_vertical_alignment_can_be_configured(): void
    {
        $this->assertNull(Column::make('name')->toArray()['vertical_align']);
        $this->assertSame('top', Column::make('description')->verticalAlign('top')->toArray()['vertical_align']);

        $this->expectException(\InvalidArgumentException::class);
        Column::make('name')->verticalAlign('center');
    }

    public function test_typed_filters_normalize_values_and_reject_invalid_operators(): void
    {
        $this->assertSame(12, NumberFilter::make()->normalize('equals', '12'));
        $this->assertTrue(BooleanFilter::make()->normalize('equals', 'true'));
        $this->assertSame(
            ['2026-01-01', '2026-06-30'],
            DateFilter::make()->normalize('between', [
                'from' => '2026-01-01',
                'to' => '2026-06-30',
            ]),
        );

        $this->expectException(ValidationException::class);
        NumberFilter::make()->normalize('contains', 12);
    }
}
