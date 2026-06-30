<?php

namespace Poshtive\Petak\Tests;

use Orchestra\Testbench\TestCase as Orchestra;
use Poshtive\Petak\PetakServiceProvider;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [
            PetakServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);
        $app['config']->set('app.url', 'http://localhost');
        $app['url']->forceRootUrl('http://localhost');
    }
}
