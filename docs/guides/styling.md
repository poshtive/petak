# Styling and Themes

Petak exposes structural CSS, a default theme, and a Bootstrap variable bridge.

```js
import '@poshtive/petak/petak.css';
import '@poshtive/petak/structural.css';
import '@poshtive/petak/themes/bootstrap.css';
```

## Grid Appearance

Petak follows the surrounding application theme by default. Leave `theme` as
`null` to inherit application tokens, Bootstrap variables, or the browser color
scheme fallback. Use `theme('dark')` only when a specific grid should be forced
dark regardless of the page context.

```php
$grid
    ->density('compact')
    ->striped()
    ->bordered()
    ->theme(null)
    ->verticalAlign('middle')
    ->className('users-grid');
```

## Column Appearance

```php
Column::make('amount')->align('end');
Column::make('status')->align('center');
Column::make('action')->fitContent();
Column::make('notes')->verticalAlign('top');
Column::make('created_at')->responsivePriority(2);
Column::make('actions')->pin('right');
```

## CSS Tokens

Override Petak tokens on `.petak` or a custom grid class:

```css
.users-grid {
    --petak-surface: var(--admin-surface);
    --petak-border-color: var(--admin-border);
    --petak-color: var(--admin-text);
}
```
