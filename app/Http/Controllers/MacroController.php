<?php

namespace App\Http\Controllers;

use App\Services\MacroService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MacroController extends Controller
{
    public function __construct(private readonly MacroService $macro) {}

    /**
     * Show the global market page with selectable instruments and timeframes.
     */
    public function markets(): Response
    {
        return Inertia::render('pasar/index', [
            'catalog' => $this->macro->catalog(),
        ]);
    }

    /**
     * Return a price series for one instrument and timeframe as JSON.
     */
    public function series(Request $request): JsonResponse
    {
        $series = $this->macro->series(
            (string) $request->query('symbol'),
            (string) $request->query('timeframe', '1Y'),
        );

        abort_if($series === null, 404);

        return response()->json($series);
    }

    /**
     * Show the macro indicators map across countries.
     */
    public function indicators(): Response
    {
        return Inertia::render('indikator/index', [
            'indicators' => $this->macro->indicators(),
        ]);
    }

    /**
     * Show a single country's macro detail.
     */
    public function country(string $iso3): Response
    {
        $country = $this->macro->country(strtoupper($iso3));

        abort_if($country === null, 404);

        return Inertia::render('indikator/show', [
            'country' => $country,
        ]);
    }
}
