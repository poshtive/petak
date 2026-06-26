<?php

namespace Poshtive\Petak;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

final class PetakServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/petak.php', 'petak');

        $this->app->singleton(SourceFactory::class);
        $this->app->singleton(GridEngine::class);
        $this->app->singleton('petak', fn ($app) => new PetakManager(
            $app,
            $app->make(SourceFactory::class),
            $app->make(GridEngine::class),
        ));
        $this->app->alias('petak', PetakManager::class);
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'petak');
        Blade::anonymousComponentPath(__DIR__.'/../resources/views/components', 'petak');

        $this->publishes([
            __DIR__.'/../config/petak.php' => config_path('petak.php'),
        ], 'petak-config');
    }
}
