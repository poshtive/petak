@props([
    'grid',
    'renderer' => 'tabulator',
    'transport' => null,
    'livewireMethod' => 'loadPetak',
])

@php
    $configuration = $grid->configuration();
    $configuration['renderer'] = $renderer;
    $configuration['transport'] = $transport;
    $configuration['livewire_method'] = $livewireMethod;
    $appearance = $configuration['appearance'];
    $rootClasses = [
        'petak',
        'petak--'.$renderer,
        'petak--'.$appearance['density'],
        'petak--striped' => $appearance['striped'],
        'petak--bordered' => $appearance['bordered'],
    ];
    if (filled($configuration['class_name'])) {
        $rootClasses[] = $configuration['class_name'];
    }
    $configurationId = 'petak-config-'.$configuration['name'].'-'.\Illuminate\Support\Str::random(8);
@endphp

@if ($renderer === 'blade')
    @include('petak::renderers.blade', [
        'grid' => $grid,
        'configuration' => $configuration,
    ])
@else
<div
    {{ $attributes->class($rootClasses) }}
    data-petak-grid
    data-petak-config="{{ $configurationId }}"
    @if ($appearance['theme']) data-petak-theme="{{ $appearance['theme'] }}" @endif
    @if ($transport === 'livewire') wire:ignore @endif
>
    @if ($configuration['global_search'] || $configuration['state'] || $configuration['bulk_actions'] || $configuration['exports'])
        <div class="petak__toolbar">
            <div class="petak__toolbar-primary">
                @if ($configuration['global_search'])
                    <label class="petak__search-label" for="{{ $configurationId }}-search">Search</label>
                    <input id="{{ $configurationId }}-search" class="petak__search" type="search"
                        placeholder="Search..." data-petak-search>
                @endif
            </div>
            <div class="petak__toolbar-actions">
                @if ($configuration['state'])
                    <div class="petak__columns">
                        <button class="petak__columns-toggle" type="button" aria-expanded="false" data-petak-columns-toggle>
                            <span>Columns</span>
                            <span class="petak__columns-caret" aria-hidden="true"></span>
                        </button>
                        <div class="petak__columns-menu" hidden data-petak-columns-menu>
                            <div class="petak__columns-heading">Visible columns</div>
                            <div class="petak__columns-list">
                                @foreach ($configuration['columns'] as $column)
                                    <label>
                                        <input type="checkbox" value="{{ $column['key'] }}" data-petak-column @checked($column['visible'])>
                                        <span>{{ $column['label'] }}</span>
                                    </label>
                                @endforeach
                            </div>
                        </div>
                    </div>
                @endif
                @foreach ($configuration['bulk_actions'] as $action)
                    <button type="button" data-petak-bulk="{{ $action['name'] }}">{{ $action['label'] }}</button>
                @endforeach
                @foreach ($configuration['exports'] as $export)
                    <button type="button" data-petak-export="{{ $export['name'] }}">{{ $export['label'] }}</button>
                @endforeach
            </div>
        </div>
    @endif
    <div class="petak__renderer" data-petak-renderer></div>
    <div class="petak__status" data-petak-status aria-live="polite"></div>
</div>

<script type="application/json" id="{{ $configurationId }}">
    {!! json_encode($configuration, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR) !!}
</script>
@endif
