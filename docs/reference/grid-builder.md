# GridBuilder Reference

Create a builder with the facade:

```php
$grid = Petak::grid()
    ->source(User::query());
```

`Petak::for($source)` is a shorthand alias for `Petak::grid()->source($source)`.

## Source

```php
source(mixed $source): self
```

`source()` accepts Eloquent builders, query builders, arrays, collections, and
custom `DataSource` instances.

## Identity

```php
name(string $name): self
rowKey(string $key): self
```

`name()` identifies the grid in requests and state keys. `rowKey()` controls
which row field is sent for bulk actions and inline edits.

## Columns

```php
columns(array $columns): self
sortable(bool $enabled = true): self
filterable(bool $enabled = true): self
globalSearch(bool $enabled = true): self
defaultSort(array $sort): self
```

`columns()` accepts `Column` objects, string keys, or key-label pairs.

## Pagination

```php
pagination(
    int $defaultPageSize = 25,
    int $maxPageSize = 250,
    array $pageSizes = []
): self
```

## Initial Data

```php
preload(bool $enabled = true): self
```

`preload()` includes the first remote page in the grid configuration so the
native renderer can paint initial rows without waiting for its first data
request. Local grids always include initial rows.

## State

```php
state(GridState $state): self
```

## Actions and Export

```php
bulkActions(array $actions): self
exports(array $exports): self
```

## Appearance

```php
density(string $density): self
striped(bool $enabled = true): self
bordered(bool $enabled = true): self
theme(?string $theme): self
verticalAlign(string $align): self
className(?string $className): self
responsiveLayout(?string $layout, ?bool $collapseStartOpen = null): self
```

Density values: `compact`, `comfortable`, `spacious`.

`theme(null)` inherits the application theme. `theme('dark')` forces dark mode
for that grid through `data-petak-theme="dark"`.

Vertical alignment values: `top`, `middle`, `bottom`.

Responsive layout values: `null`, `hide`, `collapse`. The `collapse` layout
uses column `responsivePriority()` values to move lower-priority columns into
each row's responsive detail area.

## Rendering and Execution

```php
handle(Request $request, string|Closure $view, array $data = []): Response|View
configuration(?string $endpoint = null): array
response(?Request $request = null): JsonResponse
bladeResult(?Request $request = null): GridResult
execute(array $payload): GridResult
```

Use `handle()` for normal controller usage.
