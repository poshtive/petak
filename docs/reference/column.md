# Column Reference

Create a column:

```php
Column::make('email');
```

## Labels and Values

```php
label(string $label): static
value(string $path): static
valueUsing(Closure $resolver): static
```

## Sorting, Filtering, Search

```php
sortable(bool $enabled = true): static
sortableUsing(Closure $resolver): static
sortBy(string $field): static

filterable(bool $enabled = true): static
filter(Filter $filter): static
filterUsing(Closure $resolver): static
filterBy(string $field): static

searchable(bool $enabled = true): static
```

## Export and Editing

```php
exportUsing(Closure $resolver): static
exportable(bool $exportable = true): static
editableUsing(Closure $resolver): static
```

## Type Helpers

```php
text(): static
integer(): static
number(): static
boolean(): static
date(): static
dateTime(): static
```

Types choose default filters and alignment.

## Layout

```php
visible(bool $visible = true): static
align(string $align): static
verticalAlign(?string $align): static
responsivePriority(int $priority): static
fitContent(bool $enabled = true): static
pin(string $side = 'left'): static
trustedHtml(bool $enabled = true): static
```

Alignment values: `start`, `center`, `end`.

Vertical alignment values: `top`, `middle`, `bottom`.

Pin side values: `left`, `right`.
