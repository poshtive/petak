# Assets and Rendering

Import the JavaScript initializer and one CSS entry point in your app bundle:

```js
import { initializePetak } from '@poshtive/petak';
import '@poshtive/petak/petak.css';

initializePetak();
```

Available CSS entry points:

```js
import '@poshtive/petak/petak.css'; // structure + renderers + default theme
import '@poshtive/petak/structural.css'; // shell structure only
import '@poshtive/petak/renderers/tabulator.css'; // Tabulator vendor + adapter
import '@poshtive/petak/renderers/blade.css'; // Blade table renderer
import '@poshtive/petak/themes/default.css'; // default tokens and controls
import '@poshtive/petak/themes/bootstrap.css'; // Bootstrap variable bridge
```

Render a grid with the default Tabulator renderer:

```blade
<x-petak::grid :grid="$grid" />
```

Render with Blade:

```blade
<x-petak::grid :grid="$grid" renderer="blade" />
```

Use Livewire transport:

```blade
<x-petak::grid :grid="$grid" transport="livewire" />
```
