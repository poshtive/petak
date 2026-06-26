@props([
    'grid',
    'renderer' => 'tabulator',
    'transport' => null,
    'endpoint' => null,
    'livewireMethod' => 'loadPetak',
])

@php
    $configuration = $grid->configuration($endpoint);
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
    @include('petak::renderers.tabulator', [
        'configuration' => $configuration,
        'configurationId' => $configurationId,
        'rootClasses' => $rootClasses,
        'appearance' => $appearance,
        'transport' => $transport,
    ])
@endif
