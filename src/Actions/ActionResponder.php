<?php

namespace Poshtive\Petak\Actions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Poshtive\Petak\Column;
use Poshtive\Petak\Exports\CsvExport;
use Poshtive\Petak\Exports\XlsxExport;
use Poshtive\Petak\GridDefinition;
use Poshtive\Petak\GridRequest;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

final readonly class ActionResponder
{
    /**
     * @param  array<string, BulkAction>  $bulkActions
     * @param  array<string, CsvExport|XlsxExport>  $exports
     */
    public function __construct(
        private GridDefinition $definition,
        private array $bulkActions,
        private array $exports,
    ) {}

    public function respond(Request $request): Response
    {
        abort_unless($request->isMethod('POST'), 405, 'Petak actions must use POST.');

        $type = (string) $request->input('petak_action.type');

        return match ($type) {
            'bulk' => $this->bulkResponse($request),
            'export' => $this->exportResponse($request),
            'edit' => $this->editResponse($request),
            default => abort(422, 'Unknown Petak action.'),
        };
    }

    private function bulkResponse(Request $request): JsonResponse
    {
        $name = (string) $request->input('petak_action.name');
        $action = $this->bulkActions[$name] ?? null;

        abort_if($action === null, 422, 'Unknown Petak bulk action.');

        $keys = array_values(array_filter(
            (array) $request->input('petak_action.keys', []),
            static fn (mixed $key) => is_int($key) || is_string($key),
        ));

        $result = $action->run(new Selection(
            keys: $keys,
            mode: (string) $request->input('petak_action.mode', 'selected'),
            request: (array) $request->input('petak_action.request', []),
        ));

        return response()->json(['ok' => true, 'result' => $result]);
    }

    private function exportResponse(Request $request): StreamedResponse
    {
        $name = (string) $request->input('petak_action.name', 'csv');
        $export = $this->exports[$name] ?? null;

        abort_if($export === null, 422, 'Unknown Petak export.');
        abort_unless($export->available(), 422, 'Petak export is not available.');
        abort_unless($export->authorized(), 403);

        $payload = (array) $request->input('petak_action.request', []);
        $gridRequest = GridRequest::fromHttp(Request::create('/', 'GET', $payload), $this->definition);
        $columns = array_filter(
            $this->definition->columns,
            static fn (Column $column) => $column->isExportable(),
        );

        if ($export instanceof XlsxExport) {
            return response()->streamDownload(
                fn () => $export->write(
                    $this->definition->source->exportRows($this->definition, $gridRequest),
                    $columns,
                ),
                "{$this->definition->name}.{$export->extension()}",
                ['Content-Type' => $export->mime()],
            );
        }

        return response()->streamDownload(function () use ($gridRequest, $columns): void {
            $stream = fopen('php://output', 'wb');
            fputcsv($stream, array_map(
                static fn (Column $column) => $column->toArray()['label'],
                $columns,
            ));

            foreach ($this->definition->source->exportRows($this->definition, $gridRequest) as $row) {
                fputcsv($stream, array_map(
                    static fn (Column $column) => strip_tags((string) $column->resolveExportValue($row)),
                    $columns,
                ));
            }

            fclose($stream);
        }, "{$this->definition->name}.{$export->extension()}", ['Content-Type' => $export->mime()]);
    }

    private function editResponse(Request $request): JsonResponse
    {
        $field = (string) $request->input('petak_action.field');
        $column = $this->definition->column($field);
        $resolver = $column?->editResolver();

        abort_if($resolver === null, 422, 'Column is not editable.');

        $result = $resolver(
            $request->input('petak_action.key'),
            $request->input('petak_action.value'),
            $request,
        );

        return response()->json(['ok' => true, 'result' => $result]);
    }
}
