# Livewire Transport

Livewire support is optional. Add `InteractsWithPetak` to a component:

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

Render:

```blade
<x-petak::grid :grid="$grid" transport="livewire" />
```

The renderer is wrapped with `wire:ignore`. Petak initializes newly morphed
grids once and destroys renderer instances when their DOM is removed.

