@php
    $columnArray = $column->toArray();
    $filter = $columnArray['filter'];
    $fieldName = "{$stateKey}[filters][{$column->key()}]";
    $operatorName = "{$stateKey}[operators][{$column->key()}]";
    $value = data_get($state, "filters.{$column->key()}", '');
    $label = 'Filter '.$columnArray['label'];
@endphp

@if ($filter['component'] === 'select')
    <select name="{{ $fieldName }}" aria-label="{{ $label }}">
        <option value=""></option>
        @foreach ($filter['options'] as $optionValue => $optionLabel)
            <option value="{{ $optionValue }}" @selected((string) $value === (string) $optionValue)>
                {{ $optionLabel }}
            </option>
        @endforeach
    </select>
@else
    <input
        name="{{ $fieldName }}"
        type="{{ $filter['input_type'] }}"
        value="{{ $value }}"
        aria-label="{{ $label }}"
        @if ($filter['placeholder']) placeholder="{{ $filter['placeholder'] }}" @endif
    >
@endif

<input
    type="hidden"
    name="{{ $operatorName }}"
    value="{{ $column->filterDefinition()->defaultOperator() }}"
>
