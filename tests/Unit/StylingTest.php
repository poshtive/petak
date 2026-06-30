<?php

namespace Poshtive\Petak\Tests\Unit;

use PHPUnit\Framework\TestCase;

class StylingTest extends TestCase
{
    public function test_public_css_entry_points_and_tokens_exist(): void
    {
        $root = dirname(__DIR__, 2);
        $package = file_get_contents($root.'/package.json');
        $tokens = file_get_contents($root.'/resources/css/tokens.css');
        $structural = file_get_contents($root.'/resources/css/structural.css');
        $native = file_get_contents($root.'/resources/css/renderers/native.css');
        $defaultTheme = file_get_contents($root.'/resources/css/themes/default.css');
        $bootstrap = file_get_contents($root.'/resources/css/themes/bootstrap.css');

        $this->assertStringContainsString('"./structural.css"', $package);
        $this->assertStringContainsString('"./renderers/native.css"', $package);
        $this->assertStringContainsString('"./renderers/blade.css"', $package);
        $this->assertStringContainsString('"./themes/default.css"', $package);
        $this->assertStringContainsString('"./themes/bootstrap.css"', $package);
        $this->assertStringContainsString('--petak-row-height', $tokens);
        $this->assertStringContainsString('--petak-focus-color', $tokens);
        $this->assertStringContainsString('prefers-reduced-motion', $tokens);
        $this->assertStringContainsString(':root:not([data-bs-theme]):not([data-theme])', $tokens);
        $this->assertStringContainsString('.petak[data-petak-theme="dark"]', $tokens);
        $this->assertStringContainsString('color-scheme: dark', $tokens);
        $this->assertStringContainsString('.petak__renderer', $structural);
        $this->assertStringContainsString('block-size: var(--petak-control-height)', $structural);
        $this->assertStringContainsString('.petak__columns-toggle', $structural);
        $this->assertStringContainsString('.petak__columns-menu', $structural);
        $this->assertStringContainsString('border-block-start: .34rem solid currentColor', $structural);
        $this->assertStringNotContainsString('.petak__columns summary', $defaultTheme);
        $this->assertStringContainsString('.petak--native .petak__renderer', $native);
        $this->assertStringContainsString('.petak-native__sticky', $native);
        $this->assertStringContainsString('.petak-native__details', $native);
        $this->assertStringContainsString('.petak-native__table-scroll', $native);
        $this->assertStringContainsString('.petak-native__table.is-bordered', $native);
        $this->assertStringContainsString('.petak-native__table-scroll.is-bordered', $native);
        $this->assertStringContainsString('border-collapse: separate', $native);
        $this->assertStringContainsString('.petak-native__table.is-bordered th', $native);
        $this->assertStringContainsString('border-inline-start: var(--petak-border-width, 1px) solid var(--petak-border-color, #d7d7dc)', $native);
        $this->assertStringContainsString('.petak-native__table tbody tr:last-child > td', $native);
        $this->assertStringContainsString('margin-block-start: calc(var(--petak-border-width, 1px) * -1)', $native);
        $this->assertStringContainsString('border: var(--petak-border-width, 1px) solid var(--petak-border-color, #d7d7dc)', $native);
        $this->assertStringContainsString('--bs-body-color', $bootstrap);
        $this->assertStringNotContainsString('--admin-', $bootstrap);
    }

    public function test_package_theme_does_not_style_global_controls(): void
    {
        $root = dirname(__DIR__, 2).'/resources/css';

        foreach ([
            'structural.css',
            'themes/default.css',
            'themes/bootstrap.css',
            'renderers/native.css',
            'renderers/blade.css',
        ] as $file) {
            $css = file_get_contents($root.'/'.$file);

            $this->assertDoesNotMatchRegularExpression(
                '/(^|})\s*(table|button|input|select|a)\s*[{,]/m',
                $css,
                "Unscoped selector found in {$file}.",
            );
        }
    }
}
