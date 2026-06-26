<?php

namespace Poshtive\Petak\Tests\Feature;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;
use Poshtive\Petak\Actions\BulkAction;
use Poshtive\Petak\Column;
use Poshtive\Petak\Columns\ActionColumn;
use Poshtive\Petak\Columns\HtmlColumn;
use Poshtive\Petak\Concerns\InteractsWithPetak;
use Poshtive\Petak\Enums\GridMode;
use Poshtive\Petak\Enums\SortDirection;
use Poshtive\Petak\Exports\CsvExport;
use Poshtive\Petak\Exports\XlsxExport;
use Poshtive\Petak\Facades\Petak;
use Poshtive\Petak\Filters\TextFilter;
use Poshtive\Petak\GridBuilder;
use Poshtive\Petak\GridRequest;
use Poshtive\Petak\State\GridState;
use Poshtive\Petak\Tests\TestCase;

class GridTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('petak_items', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->string('name');
            $table->integer('score');
            $table->boolean('active');
        });

        Schema::create('petak_groups', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
        });

        DB::table('petak_groups')->insert([
            ['id' => 1, 'name' => 'Primary'],
            ['id' => 2, 'name' => 'Secondary'],
        ]);

        DB::table('petak_items')->insert([
            ['group_id' => 2, 'name' => 'Alpha', 'score' => 10, 'active' => true],
            ['group_id' => 1, 'name' => 'Bravo', 'score' => 30, 'active' => false],
            ['group_id' => 1, 'name' => 'Charlie', 'score' => 20, 'active' => true],
        ]);

        View::addNamespace('petak-test', __DIR__.'/../Fixtures');

        Route::get('/petak/items', function (Request $request) {
            return Petak::for(DB::table('petak_items'))
                ->name('items')
                ->columns([
                    Column::make('id')->integer()->sortable()->filterable(),
                    Column::make('name')->sortable()->filterable(),
                    Column::make('score')->integer()->sortable()->filterable(),
                    Column::make('active')->boolean()->filterable(),
                ])
                ->handle($request, 'petak-test::grid');
        });

        Route::get('/petak/blade', function (Request $request) {
            return Petak::for(PetakItem::query())
                ->name('blade-items')
                ->columns([
                    Column::make('id')->integer()->sortable()->filterable(),
                    Column::make('name')->searchable()->sortable()->filterable(),
                    HtmlColumn::make('badge')->renderUsing(
                        fn (PetakItem $item) => '<strong>'.e($item->name).'</strong>',
                    ),
                ])
                ->globalSearch()
                ->density('compact')
                ->striped()
                ->bordered(false)
                ->theme('dark')
                ->className('inventory-grid')
                ->handle($request, 'petak-test::grid', ['renderer' => 'blade']);
        });

        Route::post('/petak/actions', function (Request $request) {
            return Petak::for(PetakItem::query())
                ->name('action-items')
                ->columns([
                    Column::make('id')->integer(),
                    Column::make('name')
                        ->editableUsing(function ($key, $value): int {
                            return PetakItem::query()->whereKey($key)->update(['name' => $value]);
                        })
                        ->exportUsing(fn (PetakItem $item) => 'export-'.$item->name),
                    ActionColumn::make()->view('petak-test::actions'),
                ])
                ->bulkActions([
                    BulkAction::make('score')->handle(
                        fn ($selection) => PetakItem::query()
                            ->whereKey($selection->keys())
                            ->update(['score' => 99]),
                    ),
                ])
                ->exports([CsvExport::make(), XlsxExport::make()])
                ->handle($request, 'petak-test::grid');
        });
    }

    public function test_one_route_renders_container_and_serves_remote_data(): void
    {
        $this->get('/petak/items')
            ->assertOk()
            ->assertSee('data-petak-grid', false)
            ->assertSee('"name":"items"', false);

        $payload = [
            'version' => '1',
            'grid' => 'items',
            'page' => ['mode' => 'page', 'number' => 1, 'size' => 2],
            'sort' => [['field' => 'score', 'direction' => 'desc']],
            'filters' => [['field' => 'name', 'operator' => 'contains', 'value' => 'a']],
        ];

        $this->withHeader('X-Petak-Request', 'items')
            ->get('/petak/items?petak_request='.urlencode(json_encode($payload)))
            ->assertOk()
            ->assertJsonPath('version', '1')
            ->assertJsonPath('data.0.name', 'Bravo')
            ->assertJsonPath('data.1.name', 'Charlie')
            ->assertJsonPath('meta.pagination.total', 3)
            ->assertJsonPath('meta.pagination.per_page', 2);
    }

    public function test_invalid_sort_filter_operator_and_page_size_are_rejected(): void
    {
        foreach ([
            ['sort' => [['field' => 'missing', 'direction' => 'asc']]],
            ['filters' => [['field' => 'score', 'operator' => 'contains', 'value' => '1']]],
            ['page' => ['number' => 1, 'size' => 251]],
        ] as $override) {
            $payload = array_replace_recursive([
                'version' => '1',
                'grid' => 'items',
                'page' => ['number' => 1, 'size' => 25],
                'sort' => [],
                'filters' => [],
            ], $override);

            $this->withHeader('X-Petak-Request', 'items')
                ->withHeader('Accept', 'application/json')
                ->get('/petak/items?petak_request='.urlencode(json_encode($payload)))
                ->assertUnprocessable();
        }
    }

    public function test_array_and_collection_sources_have_local_filter_sort_and_pagination(): void
    {
        $rows = [
            ['id' => 1, 'name' => 'Zulu', 'score' => 10],
            ['id' => 2, 'name' => 'Alpha', 'score' => 30],
            ['id' => 3, 'name' => 'Bravo', 'score' => 20],
        ];

        foreach ([$rows, collect($rows)] as $source) {
            $grid = Petak::for($source)
                ->name('local-items')
                ->columns([
                    Column::make('id')->integer(),
                    Column::make('name')->sortable()->filterable(),
                    Column::make('score')->integer()->sortable()->filterable(),
                ]);

            $definition = $grid->definition();
            $result = $definition->source->execute($definition, new GridRequest(
                page: 1,
                pageSize: 1,
                sort: [['field' => 'score', 'direction' => SortDirection::Desc]],
                filters: [['field' => 'name', 'operator' => 'contains', 'value' => 'a']],
            ));

            $this->assertSame(GridMode::Local, $definition->mode);
            $this->assertSame('Alpha', $result->data[0]['name']);
            $this->assertSame(2, $result->meta['pagination']['total']);
            $this->assertSame(['Zulu', 'Alpha', 'Bravo'], array_column(
                $grid->configuration()['initialResult']['data'],
                'name',
            ));
        }
    }

    public function test_eloquent_source_is_resolved_and_executed(): void
    {
        $model = new class extends Model
        {
            protected $table = 'petak_items';

            public $timestamps = false;

            protected $guarded = [];
        };

        $grid = Petak::for($model->newQuery())
            ->columns([
                Column::make('id')->integer(),
                Column::make('name'),
            ]);

        $this->assertSame(GridMode::Remote, $grid->definition()->mode);
    }

    public function test_vertical_alignment_is_resolved_from_config_grid_and_columns(): void
    {
        config()->set('petak.appearance.vertical_align', 'bottom');

        $default = Petak::for([['name' => 'Ada']])
            ->columns(['name'])
            ->configuration();

        $configured = Petak::for([['name' => 'Ada', 'notes' => 'Long text']])
            ->verticalAlign('middle')
            ->columns([
                Column::make('name'),
                Column::make('notes')->verticalAlign('top'),
            ])
            ->configuration();

        $this->assertSame('bottom', $default['appearance']['vertical_align']);
        $this->assertNull($default['columns'][0]['vertical_align']);
        $this->assertSame('middle', $configured['appearance']['vertical_align']);
        $this->assertNull($configured['columns'][0]['vertical_align']);
        $this->assertSame('top', $configured['columns'][1]['vertical_align']);
    }

    public function test_named_grid_uses_a_fresh_factory_instance(): void
    {
        Petak::define('scores', fn () => Petak::for([['score' => 10]])->columns(['score']));

        $this->assertNotSame(Petak::get('scores'), Petak::get('scores'));
        $this->assertSame('scores', Petak::get('scores')->definition()->name);
    }

    public function test_global_search_and_blade_action_column_are_applied_server_side(): void
    {
        $grid = Petak::for(PetakItem::query())
            ->columns([
                Column::make('name')->searchable(),
                ActionColumn::make()->view(
                    'petak-test::actions',
                    data: fn (PetakItem $item) => ['suffix' => $item->score],
                ),
            ]);

        $definition = $grid->definition();
        $result = $definition->source->execute($definition, new GridRequest(
            page: 1,
            pageSize: 25,
            sort: [],
            filters: [],
            search: 'brav',
        ));

        $this->assertCount(1, $result->data);
        $this->assertSame('Bravo', $result->data[0]['name']);
        $this->assertStringContainsString('/items/2', $result->data[0]['action']);
        $this->assertStringContainsString('View Bravo', $result->data[0]['action']);
        $this->assertStringContainsString('30', $result->data[0]['action']);
    }

    public function test_joined_alias_mapping_default_sort_and_html_column(): void
    {
        $grid = Petak::for(
            DB::table('petak_items')
                ->join('petak_groups', 'petak_items.group_id', '=', 'petak_groups.id')
                ->select([
                    'petak_items.id',
                    'petak_items.name',
                    'petak_groups.name as group_name',
                ]),
        )
            ->columns([
                Column::make('id')->sortBy('petak_items.id')->sortable(),
                Column::make('group_name')
                    ->sortBy('petak_groups.name')
                    ->filterBy('petak_groups.name')
                    ->searchable()
                    ->sortable()
                    ->filterable(),
                HtmlColumn::make('badge')->renderUsing(
                    fn (object $row) => '<strong>'.e($row->name).'</strong>',
                ),
            ])
            ->defaultSort([
                ['field' => 'id', 'direction' => 'desc'],
            ]);

        $definition = $grid->definition();
        $request = Request::create('/', 'GET', [
            'version' => '1',
            'page' => ['number' => 1, 'size' => 25],
            'sort' => [],
            'filters' => [[
                'field' => 'group_name',
                'operator' => 'contains',
                'value' => 'primary',
            ]],
        ]);
        $result = $definition->source->execute(
            $definition,
            GridRequest::fromHttp($request, $definition),
        );

        $this->assertSame([3, 2], array_column($result->data, 'id'));
        $this->assertSame('Primary', $result->data[0]['group_name']);
        $this->assertSame('<strong>Charlie</strong>', $result->data[0]['badge']);
        $this->assertTrue($definition->column('badge')->isTrustedHtml());
    }

    public function test_custom_filter_and_sort_callbacks_support_relations_and_computed_columns(): void
    {
        $grid = Petak::for(PetakItem::query())
            ->columns([
                Column::make('name'),
                Column::make('group')
                    ->valueUsing(fn (PetakItem $item) => $item->group->name)
                    ->filter(TextFilter::make())
                    ->filterUsing(function ($query, string $operator, string $value): void {
                        $query->whereHas(
                            'group',
                            fn ($group) => $group->where('name', $operator === 'equals' ? '=' : 'like', $operator === 'equals' ? $value : "%{$value}%"),
                        );
                    }),
                Column::make('rank')
                    ->valueUsing(fn (PetakItem $item) => $item->score * 2)
                    ->sortableUsing(
                        fn ($query, SortDirection $direction) => $query->orderBy('score', $direction->value),
                    ),
            ]);

        $definition = $grid->definition();
        $request = Request::create('/', 'GET', [
            'version' => '1',
            'page' => ['number' => 1, 'size' => 25],
            'sort' => [['field' => 'rank', 'direction' => 'desc']],
            'filters' => [[
                'field' => 'group',
                'operator' => 'contains',
                'value' => 'primary',
            ]],
        ]);
        $result = $definition->source->execute(
            $definition,
            GridRequest::fromHttp($request, $definition),
        );

        $this->assertSame(['Bravo', 'Charlie'], array_column($result->data, 'name'));
        $this->assertSame(['Primary', 'Primary'], array_column($result->data, 'group'));
        $this->assertSame([60, 40], array_column($result->data, 'rank'));
    }

    public function test_blade_renderer_uses_query_state_without_javascript(): void
    {
        $query = http_build_query([
            'petak_state' => [
                'blade-items' => [
                    'search' => 'a',
                    'filters' => ['name' => 'a'],
                    'operators' => ['name' => 'contains'],
                    'sort' => 'name',
                    'direction' => 'desc',
                    'page' => 1,
                    'size' => 2,
                ],
            ],
        ]);

        $this->get('/petak/blade?'.$query)
            ->assertOk()
            ->assertSee('petak--blade', false)
            ->assertSee('petak--compact', false)
            ->assertSee('petak--striped', false)
            ->assertSee('inventory-grid', false)
            ->assertSee('data-petak-theme="dark"', false)
            ->assertSee('data-vertical-align="middle"', false)
            ->assertSee('Showing 1 to 2 of 3 entries')
            ->assertDontSee('petak--bordered', false)
            ->assertSeeInOrder(['Charlie', 'Bravo'])
            ->assertDontSee('Alpha')
            ->assertSee('<strong>Charlie</strong>', false)
            ->assertSee('Next');
    }

    public function test_array_and_database_sources_have_filter_sort_pagination_parity(): void
    {
        $rows = DB::table('petak_items')->orderBy('id')->get()->map(
            fn (object $row) => (array) $row,
        )->all();
        $columns = fn () => [
            Column::make('id')->integer(),
            Column::make('name')->sortable()->filterable(),
            Column::make('score')->integer()->sortable()->filterable(),
        ];
        $payload = [
            'version' => '1',
            'page' => ['number' => 1, 'size' => 2],
            'sort' => [['field' => 'score', 'direction' => 'desc']],
            'filters' => [['field' => 'name', 'operator' => 'contains', 'value' => 'a']],
        ];

        $databaseResult = Petak::for(DB::table('petak_items'))
            ->columns($columns())
            ->execute($payload);
        $arrayResult = Petak::for($rows)
            ->columns($columns())
            ->execute($payload);

        $this->assertSame($databaseResult->data, $arrayResult->data);
        $this->assertSame(
            $databaseResult->meta['pagination'],
            $arrayResult->meta['pagination'],
        );
    }

    public function test_livewire_concern_executes_named_component_grid(): void
    {
        $component = new class
        {
            use InteractsWithPetak;

            protected function petakGrid(string $name): GridBuilder
            {
                return Petak::for([['name' => 'Alpha']])
                    ->name($name)
                    ->columns(['name']);
            }
        };

        $result = $component->loadPetak([
            'version' => '1',
            'grid' => 'livewire-items',
            'page' => ['number' => 1, 'size' => 25],
            'sort' => [],
            'filters' => [],
        ]);

        $this->assertSame('Alpha', $result['data'][0]['name']);
    }

    public function test_state_schema_and_advanced_filter_groups_use_page_pagination(): void
    {
        $grid = Petak::for(PetakItem::query())
            ->name('stateful')
            ->columns([
                Column::make('id')->integer()->sortable(),
                Column::make('name')->filterable(),
                Column::make('score')->integer()->filterable(),
            ])
            ->state(GridState::make('items')->version(2))
            ->pagination(defaultPageSize: 2)
            ->defaultSort([['field' => 'id', 'direction' => 'asc']]);

        $configuration = $grid->configuration();
        $result = $grid->execute([
            'version' => '1',
            'page' => ['size' => 2],
            'sort' => [],
            'filters' => [[
                'boolean' => 'or',
                'filters' => [
                    ['field' => 'name', 'operator' => 'equals', 'value' => 'Alpha'],
                    ['field' => 'score', 'operator' => 'greater_than', 'value' => 15],
                ],
            ]],
        ]);

        $this->assertSame(2, $configuration['state']['version']);
        $this->assertSame('page', $configuration['pagination']['mode']);
        $this->assertSame('comfortable', $configuration['appearance']['density']);
        $this->assertCount(2, $result->data);
        $this->assertSame('page', $result->meta['pagination']['mode']);
        $this->assertSame(2, $result->meta['pagination']['per_page']);
    }

    public function test_bulk_edit_and_csv_export_actions_use_registered_server_callbacks(): void
    {
        $this->postJson('/petak/actions', [
            'petak_action' => [
                'grid' => 'action-items',
                'type' => 'bulk',
                'name' => 'score',
                'keys' => [1, 2],
            ],
        ])->assertOk()->assertJsonPath('result', 2);

        $this->assertSame(99, PetakItem::query()->findOrFail(1)->score);

        $this->postJson('/petak/actions', [
            'petak_action' => [
                'grid' => 'action-items',
                'type' => 'edit',
                'field' => 'name',
                'key' => 1,
                'value' => 'Updated',
            ],
        ])->assertOk();

        $this->assertSame('Updated', PetakItem::query()->findOrFail(1)->name);

        $response = $this->post('/petak/actions', [
            'petak_action' => [
                'grid' => 'action-items',
                'type' => 'export',
                'name' => 'csv',
                'request' => [
                    'version' => '1',
                    'page' => ['number' => 1, 'size' => 25],
                    'sort' => [],
                    'filters' => [],
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertStringContainsString('ID,Name', $response->streamedContent());
        $this->assertStringContainsString('export-Updated', $response->streamedContent());
        $this->assertStringNotContainsString('action', $response->streamedContent());

        $xlsx = $this->post('/petak/actions', [
            'petak_action' => [
                'grid' => 'action-items',
                'type' => 'export',
                'name' => 'xlsx',
                'request' => [
                    'version' => '1',
                    'page' => ['number' => 1, 'size' => 25],
                    'sort' => [],
                    'filters' => [],
                ],
            ],
        ]);

        $xlsx->assertUnprocessable();
    }

    public function test_xlsx_export_is_hidden_when_optional_writer_is_missing(): void
    {
        $configuration = Petak::for([['id' => 1, 'name' => 'Alpha']])
            ->columns(['id', 'name'])
            ->exports([CsvExport::make(), XlsxExport::make()])
            ->configuration('/exports');

        $this->assertSame(['csv'], array_column($configuration['exports'], 'name'));
    }

    public function test_actions_require_post_even_when_route_accepts_get(): void
    {
        Route::match(['get', 'post'], '/petak/method-guard', function (Request $request) {
            return Petak::for(PetakItem::query())
                ->name('method-guard')
                ->columns(['id'])
                ->bulkActions([
                    BulkAction::make('noop')->handle(fn () => null),
                ])
                ->handle($request, 'petak-test::grid');
        });

        $this->get('/petak/method-guard?'.http_build_query([
            'petak_action' => [
                'grid' => 'method-guard',
                'type' => 'bulk',
                'name' => 'noop',
            ],
        ]))->assertStatus(405);
    }

    public function test_row_key_and_local_row_limit_are_exposed(): void
    {
        $configuration = Petak::for([
            ['uuid' => 'one', 'name' => 'Alpha'],
        ])
            ->name('uuid-items')
            ->rowKey('uuid')
            ->columns(['uuid', 'name'])
            ->configuration('/uuid-items');

        $this->assertSame('uuid', $configuration['row_key']);

        config()->set('petak.max_local_rows', 1);

        $this->expectException(\LengthException::class);

        Petak::for([
            ['id' => 1],
            ['id' => 2],
        ])->columns(['id'])->configuration('/too-many');
    }
}

class PetakItem extends Model
{
    protected $table = 'petak_items';

    public $timestamps = false;

    protected $guarded = [];

    public function group(): BelongsTo
    {
        return $this->belongsTo(PetakGroup::class, 'group_id');
    }
}

class PetakGroup extends Model
{
    protected $table = 'petak_groups';

    public $timestamps = false;

    protected $guarded = [];
}
