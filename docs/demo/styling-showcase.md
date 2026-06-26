# Styling Showcase

Set grid appearance fluently:

```php
$grid
    ->density('compact')
    ->striped()
    ->bordered()
    ->theme('dark')
    ->className('users-grid')
    ->verticalAlign('middle');
```

Tune individual columns:

```php
Column::make('amount')->number()->align('end');
Column::make('action')->fitContent();
Column::make('notes')->verticalAlign('top');
Column::make('created_at')->responsivePriority(2);
```

Override Petak tokens in app CSS:

```css
.users-grid {
    --petak-surface: var(--admin-surface);
    --petak-border-color: var(--admin-border);
    --petak-surface-hover: color-mix(in srgb, var(--admin-accent), transparent 92%);
}
```

