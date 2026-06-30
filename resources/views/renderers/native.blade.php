<div
    {{ $attributes->class($rootClasses) }}
    data-petak-grid
    data-petak-config="{{ $configurationId }}"
    @if ($appearance['theme']) data-petak-theme="{{ $appearance['theme'] }}" @endif
    @if ($transport === 'livewire') wire:ignore @endif
>
    @include('petak::partials.toolbar', [
        'configuration' => $configuration,
        'configurationId' => $configurationId,
    ])

    <div class="petak__renderer" data-petak-renderer></div>
    <div class="petak__status" data-petak-status aria-live="polite"></div>
</div>

<script type="application/json" id="{{ $configurationId }}">
    {!! json_encode($configuration, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR) !!}
</script>
