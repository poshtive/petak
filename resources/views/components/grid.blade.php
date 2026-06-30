@props([
    'grid',
    'renderer' => null,
    'transport' => null,
    'endpoint' => null,
    'livewireMethod' => 'loadPetak',
])

@php
        $renderer ??= app(\Poshtive\Petak\PetakConfig::class)->defaultRenderer;
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

@php
    $rendererView = app(\Poshtive\Petak\Renderers\RendererRegistry::class)->view($renderer);
@endphp
@include($rendererView, [
    'grid' => $grid,
    'configuration' => $configuration,
    'configurationId' => $configurationId,
    'rootClasses' => $rootClasses,
    'appearance' => $appearance,
    'transport' => $transport,
])
