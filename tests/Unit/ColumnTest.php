<?php

namespace Poshtive\Petak\Tests\Unit;

use Illuminate\Support\HtmlString;
use Illuminate\Validation\ValidationException;
use Poshtive\Petak\Column;
use Poshtive\Petak\Columns\ActionColumn;
use Poshtive\Petak\Filters\BooleanFilter;
use Poshtive\Petak\Filters\DateFilter;
use Poshtive\Petak\Filters\NumberFilter;
use Poshtive\Petak\Filters\SelectFilter;
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
        $this->assertSame('fluid', $id['sizing']['mode']);
        $this->assertSame(BooleanFilter::type(), $active['filter']['type']);
        $this->assertSame('center', $active['align']);
        $this->assertSame(DateFilter::type(), $date['filter']['type']);
    }

    public function test_column_sizing_can_be_configured_explicitly(): void
    {
        $column = Column::make('reference')
            ->compact(min: 72)
            ->width('12ch')
            ->maxWidth(240)
            ->toArray();
        $regular = Column::make('name')->toArray();
        $action = ActionColumn::make()->toArray();

        $this->assertSame([
            'mode' => 'compact',
            'width' => '12ch',
            'min_width' => 72,
            'max_width' => 240,
        ], $column['sizing']);
        $this->assertSame('fluid', $regular['sizing']['mode']);
        $this->assertSame('fluid', $action['sizing']['mode']);
        $this->assertSame('fluid', Column::make('id')->fluid()->toArray()['sizing']['mode']);
    }

    public function test_column_width_rejects_unsafe_css_values(): void
    {
        $this->assertSame(120, Column::make('name')->width(120)->toArray()['sizing']['width']);
        $this->assertSame('25%', Column::make('name')->width('25%')->toArray()['sizing']['width']);

        $this->expectException(\InvalidArgumentException::class);
        Column::make('name')->width('calc(100% - 1rem)');
    }

    public function test_vertical_alignment_can_be_configured(): void
    {
        $this->assertNull(Column::make('name')->toArray()['vertical_align']);
        $this->assertSame('top', Column::make('description')->verticalAlign('top')->toArray()['vertical_align']);

        $this->expectException(\InvalidArgumentException::class);
        Column::make('name')->verticalAlign('center');
    }

    public function test_column_can_be_pinned(): void
    {
        $this->assertNull(Column::make('name')->toArray()['pin']);
        $this->assertSame('left', Column::make('id')->pin()->toArray()['pin']);
        $this->assertSame('right', Column::make('actions')->pin('right')->toArray()['pin']);

        $this->expectException(\InvalidArgumentException::class);
        Column::make('name')->pin('center');
    }

    public function test_export_fallback_uses_raw_value_without_display_html(): void
    {
        $column = Column::make('status')
            ->trustedHtml()
            ->valueUsing(fn () => new HtmlString('<strong>Active</strong>'));

        $this->assertSame('<strong>Active</strong>', $column->resolveValue([]));
        $this->assertSame('', $column->resolveExportValue([]));

        $exportColumn = Column::make('status')
            ->trustedHtml()
            ->valueUsing(fn () => new HtmlString('<strong>Active</strong>'))
            ->exportUsing(fn () => 'Active');

        $this->assertSame('Active', $exportColumn->resolveExportValue([]));
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

    public function test_filter_schema_exposes_renderer_metadata(): void
    {
        $filter = SelectFilter::make([
            'draft' => 'Draft',
            'paid' => 'Paid',
        ])->toArray();

        $this->assertSame('select', $filter['type']);
        $this->assertSame('select', $filter['component']);
        $this->assertSame(['draft' => 'Draft', 'paid' => 'Paid'], $filter['options']);
        $this->assertFalse($filter['multiple']);
    }
}
