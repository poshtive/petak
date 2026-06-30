<?php

namespace Poshtive\Petak;

use InvalidArgumentException;

/**
 * Validated representation of the merged petak configuration.
 */
final readonly class PetakConfig
{
    public function __construct(
        public string $defaultRenderer,
        public int $defaultPageSize,
        public int $maxPageSize,
        public array $pageSizes,
        public int $maxLocalRows,
        public int $maxFilters,
        public int $maxFilterDepth,
        public int $maxSearchLength,
        public bool $preload,
        public ?string $responsiveLayout,
        public bool $responsiveCollapseStartOpen,
        public float $stickyMaxFrozenWidthRatio,
        public int $stickyDisableBelow,
        public string $density,
        public bool $striped,
        public bool $bordered,
        public ?string $theme,
        public string $verticalAlign,
    ) {}

    public static function fromRepository(): self
    {
        $pagination = (array) config('petak.pagination', []);
        $limits = (array) config('petak.limits', []);
        $appearance = (array) config('petak.appearance', []);
        $responsive = (array) config('petak.responsive', []);
        $sticky = (array) ((array) config('petak.renderer_options.native.sticky', []));

        $density = (string) ($appearance['density'] ?? 'comfortable');
        $verticalAlign = (string) ($appearance['vertical_align'] ?? 'middle');
        $responsiveLayout = $responsive['layout'] ?? null;

        self::assertInArray($density, ['compact', 'comfortable', 'spacious'], 'appearance.density');
        self::assertInArray($verticalAlign, ['top', 'middle', 'bottom'], 'appearance.vertical_align');
        self::assertInArray($responsiveLayout, [null, 'hide', 'collapse'], 'responsive.layout');

        $stickyMaxFrozenWidthRatio = (float) ($sticky['max_frozen_width_ratio'] ?? 0.55);
        $stickyDisableBelow = (int) ($sticky['disable_below'] ?? 480);

        $defaultPageSize = max(1, (int) ($pagination['default_page_size'] ?? 25));
        $maxPageSize = max($defaultPageSize, (int) ($pagination['max_page_size'] ?? 250));
        $pageSizes = array_values(array_filter(
            array_map('intval', (array) ($pagination['page_sizes'] ?? [10, 25, 50, 100])),
            static fn (int $size) => $size > 0,
        ));
        $pageSizes = $pageSizes === [] ? [10, 25, 50, 100] : $pageSizes;

        return new self(
            defaultRenderer: (string) config('petak.renderer', 'native'),
            defaultPageSize: $defaultPageSize,
            maxPageSize: $maxPageSize,
            pageSizes: $pageSizes,
            maxLocalRows: max(0, (int) ($limits['max_local_rows'] ?? 1000)),
            maxFilters: max(1, (int) ($limits['max_filters'] ?? 20)),
            maxFilterDepth: max(1, (int) ($limits['max_filter_depth'] ?? 3)),
            maxSearchLength: max(0, (int) ($limits['max_search_length'] ?? 100)),
            preload: (bool) config('petak.preload', false),
            responsiveLayout: $responsiveLayout,
            responsiveCollapseStartOpen: (bool) ($responsive['collapse_start_open'] ?? false),
            stickyMaxFrozenWidthRatio: min(1.0, max(0.1, $stickyMaxFrozenWidthRatio)),
            stickyDisableBelow: max(0, $stickyDisableBelow),
            density: $density,
            striped: (bool) ($appearance['striped'] ?? false),
            bordered: (bool) ($appearance['bordered'] ?? true),
            theme: $appearance['theme'] ?? null,
            verticalAlign: $verticalAlign,
        );
    }

    private static function assertInArray(mixed $value, array $allowed, string $key): void
    {
        if (! in_array($value, $allowed, true)) {
            $allowedString = implode(', ', array_map(static fn ($v) => $v === null ? 'null' : "'{$v}'", $allowed));

            throw new InvalidArgumentException("Petak config [{$key}] must be one of: {$allowedString}.");
        }
    }
}
