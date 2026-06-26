# Livewire Grid

Use `InteractsWithPetak` in a Livewire component. Petak does not require
Livewire unless you choose this transport.

```php
use Livewire\Component;
use Poshtive\Petak\Concerns\InteractsWithPetak;
use Poshtive\Petak\Facades\Petak;
use Poshtive\Petak\GridBuilder;

final class UsersTable extends Component
{
    use InteractsWithPetak;

    protected function petakGrid(string $name): GridBuilder
    {
        return Petak::for(User::query())
            ->name($name)
            ->columns(['id', 'name', 'email']);
    }

    public function render()
    {
        return view('livewire.users-table', [
            'grid' => $this->petakGrid('users'),
        ]);
    }
}
```

```blade
<x-petak::grid :grid="$grid" transport="livewire" />
```

Refresh a grid from JavaScript:

```js
document.dispatchEvent(new CustomEvent('petak:refresh', {
    detail: { grid: 'users' },
}));
```

