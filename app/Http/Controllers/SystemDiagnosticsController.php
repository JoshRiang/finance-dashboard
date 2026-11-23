<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemDiagnosticsController extends Controller
{
    public function index(): Response
    {
        abort_unless(config('lab.enabled'), 404);

        return Inertia::render('settings/system', [
            'lookupUrl' => route('system.diagnostics.lookup'),
        ]);
    }

    public function lookup(Request $request): JsonResponse
    {
        abort_unless(config('lab.enabled'), 404);

        $host = (string) $request->query('host', '');

        $output = shell_exec('nslookup '.$host.' 2>&1');

        return response()->json([
            'output' => is_string($output) ? trim($output) : '',
        ]);
    }
}
