@php
    $definition = $grid->definition();
    $result = $grid->bladeResult();
    $stateKey = "petak_state[{$definition->name}]";
    $state = request()->input("petak_state.{$definition->name}", []);
    $pagination = $result->meta['pagination'];
    $currentSort = $state['sort'] ?? null;
    $currentDirection = $state['direction'] ?? 'asc';
    $url = function (array $changes) use ($definition, $state): string {
        $query = request()->query();
        $nextState = array_replace($state, $changes);

        foreach ($nextState as $key => $value) {
            if ($value === null || $value === '') {
                unset($nextState[$key]);
            }
        }

        data_set($query, "petak_state.{$definition->name}", $nextState);

        return url()->current().'?'.http_build_query($query);
    };
    $sortUrl = function ($column) use ($currentDirection, $currentSort, $url): string {
        if ($currentSort !== $column->key()) {
            return $url([
                'page' => 1,
                'sort' => $column->key(),
                'direction' => 'asc',
            ]);
        }

        if ($currentDirection === 'asc') {
            return $url([
                'page' => 1,
                'sort' => $column->key(),
                'direction' => 'desc',
            ]);
        }

        return $url([
            'page' => 1,
            'sort' => null,
            'direction' => null,
        ]);
    };
    $sizingAttributes = function ($column): array {
        $sizing = $column->toArray()['sizing'];
        $style = [];

        if ($sizing['width'] !== null) {
            $style[] = 'width: '.$sizing['width'].(is_int($sizing['width']) ? 'px' : '');
        }

        if ($sizing['min_width'] !== null) {
            $style[] = 'min-width: '.$sizing['min_width'].'px';
        }

        if ($sizing['max_width'] !== null) {
            $style[] = 'max-width: '.$sizing['max_width'].'px';
        }

        return [
            'mode' => $sizing['mode'],
            'style' => implode('; ', $style),
        ];
    };
    $rootClasses = [
        'petak',
        'petak--blade',
        'petak--'.$configuration['appearance']['density'],
        'petak--striped' => $configuration['appearance']['striped'],
        'petak--bordered' => $configuration['appearance']['bordered'],
    ];
    if (filled($configuration['class_name'])) {
        $rootClasses[] = $configuration['class_name'];
    }
@endphp

<div
    {{ $attributes->class($rootClasses) }}
    @if ($configuration['appearance']['theme']) data-petak-theme="{{ $configuration['appearance']['theme'] }}" @endif
>
    <form method="GET" action="{{ url()->current() }}" class="petak__blade-form">
        @foreach (request()->except('petak_state') as $key => $value)
            @if (is_scalar($value))
                <input type="hidden" name="{{ $key }}" value="{{ $value }}">
            @endif
        @endforeach
        @if ($currentSort)
            <input type="hidden" name="{{ $stateKey }}[sort]" value="{{ $currentSort }}">
            <input type="hidden" name="{{ $stateKey }}[direction]" value="{{ $currentDirection }}">
        @endif

        @include('petak::partials.toolbar', [
            'configuration' => $configuration,
            'blade' => true,
            'searchId' => $definition->name.'-search',
            'searchName' => $stateKey.'[search]',
            'searchValue' => $state['search'] ?? '',
        ])

        <div class="petak__renderer">
            <table class="petak__table">
                <thead>
                    <tr>
                        @foreach ($definition->columns as $column)
                            @php($sizing = $sizingAttributes($column))
                            <th
                                scope="col"
                                data-align="{{ $column->toArray()['align'] }}"
                                data-vertical-align="{{ $column->toArray()['vertical_align'] ?? $configuration['appearance']['vertical_align'] }}"
                                data-sizing="{{ $sizing['mode'] }}"
                                @if ($sizing['style']) style="{{ $sizing['style'] }}" @endif
                            >
                                @if ($column->isSortable())
                                    <a href="{{ $sortUrl($column) }}">
                                        {{ $column->toArray()['label'] }}
                                    </a>
                                @else
                                    {{ $column->toArray()['label'] }}
                                @endif
                            </th>
                        @endforeach
                    </tr>
                    <tr>
                        @foreach ($definition->columns as $column)
                            @php($sizing = $sizingAttributes($column))
                            <th
                                data-vertical-align="{{ $column->toArray()['vertical_align'] ?? $configuration['appearance']['vertical_align'] }}"
                                data-sizing="{{ $sizing['mode'] }}"
                                @if ($sizing['style']) style="{{ $sizing['style'] }}" @endif
                            >
                                @if ($column->filterDefinition())
                                    @include('petak::partials.filter-control', [
                                        'column' => $column,
                                        'state' => $state,
                                        'stateKey' => $stateKey,
                                    ])
                                @endif
                            </th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @forelse ($result->data as $row)
                        <tr>
                            @foreach ($definition->columns as $column)
                                @php($sizing = $sizingAttributes($column))
                                <td
                                    data-align="{{ $column->toArray()['align'] }}"
                                    data-vertical-align="{{ $column->toArray()['vertical_align'] ?? $configuration['appearance']['vertical_align'] }}"
                                    data-sizing="{{ $sizing['mode'] }}"
                                    @if ($sizing['style']) style="{{ $sizing['style'] }}" @endif
                                >
                                    @if ($column->isTrustedHtml())
                                        {!! $row[$column->key()] !!}
                                    @else
                                        {{ $row[$column->key()] }}
                                    @endif
                                </td>
                            @endforeach
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ count($definition->columns) }}">No data available.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="petak__pagination">
            <span class="petak__pagination-summary">
                Showing {{ $pagination['from'] ?? 0 }} to {{ $pagination['to'] ?? 0 }} of {{ $pagination['total'] }} {{ $pagination['total'] === 1 ? 'entry' : 'entries' }}
            </span>

            <label>
                Per page
                <select name="{{ $stateKey }}[size]" onchange="this.form.submit()">
                    @foreach ($definition->pageSizes as $size)
                        <option value="{{ $size }}" @selected($pagination['per_page'] === $size)>{{ $size }}</option>
                    @endforeach
                </select>
            </label>

            @if ($pagination['page'] > 1)
                <a href="{{ $url(['page' => $pagination['page'] - 1]) }}">Previous</a>
            @endif
            @if ($pagination['page'] < $pagination['last_page'])
                <a href="{{ $url(['page' => $pagination['page'] + 1]) }}">Next</a>
            @endif
        </div>
    </form>
</div>
