# CSS Tokens

Petak renderers consume the same `--petak-*` token contract. Override tokens on
`.petak` or a custom grid class.

```css
.petak {
    --petak-font-family: inherit;
    --petak-surface: #fff;
    --petak-color: #111827;
    --petak-muted-color: #6b7280;
    --petak-border-color: #d1d5db;
    --petak-surface-hover: #f9fafb;
    --petak-accent: #2563eb;
}
```

Use `@poshtive/petak/structural.css` when you want to provide every visual token
from the application.

