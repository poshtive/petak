@props([
    'grid',
    'renderer' => null,
    'transport' => null,
    'endpoint' => null,
    'livewireMethod' => 'loadPetak',
])

@php
    $renderer ??= config('petak.default_renderer', config('petak.renderer', 'native'));
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
@elseif ($renderer === 'native')
    @include('petak::renderers.native', [
        'configuration' => $configuration,
        'configurationId' => $configurationId,
        'rootClasses' => $rootClasses,
        'appearance' => $appearance,
        'transport' => $transport,
    ])
@else
    @include('petak::renderers.native', [
        'configuration' => $configuration,
        'configurationId' => $configurationId,
        'rootClasses' => $rootClasses,
        'appearance' => $appearance,
        'transport' => $transport,
    ])
@endif
