@php
    $showToolbar = $configuration['global_search']
        || $configuration['state']
        || $configuration['bulk_actions']
        || $configuration['exports']
        || ($blade ?? false);
    $searchId ??= ($configurationId ?? $configuration['name']).'-search';
    $searchName ??= null;
    $searchValue ??= '';
@endphp

@if ($showToolbar)
    <div class="petak__toolbar">
        <div class="petak__toolbar-primary">
            @if ($configuration['global_search'])
                <label class="petak__search-label" for="{{ $searchId }}">Search</label>
                <input
                    id="{{ $searchId }}"
                    class="petak__search"
                    type="search"
                    placeholder="Search..."
                    @if ($searchName) name="{{ $searchName }}" @endif
                    @if ($searchValue !== '') value="{{ $searchValue }}" @endif
                    @unless ($blade ?? false) data-petak-search @endunless
                >
            @endif
        </div>
        <div class="petak__toolbar-actions">
            @if ($configuration['state'] && ! ($blade ?? false))
                <div class="petak__columns">
                    <button class="petak__columns-toggle" type="button" aria-expanded="false" data-petak-columns-toggle>
                        <span>Columns</span>
                        <span class="petak__columns-caret" aria-hidden="true"></span>
                    </button>
                    <div class="petak__columns-menu" hidden data-petak-columns-menu>
                        <div class="petak__columns-header">
                            <div class="petak__columns-heading">Visible columns</div>
                        </div>
                        <button class="petak__columns-select-all" type="button" data-petak-columns-select-all>Select all</button>
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
            @if ($blade ?? false)
                <button type="submit">Apply</button>
            @endif
        </div>
    </div>
@endif
