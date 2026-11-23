<?php

namespace App\Http\Controllers;

use App\Services\GexService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GexController extends Controller
{
    public function __construct(private readonly GexService $gex) {}

    /**
     * Show the dealer positioning and gamma exposure analysis.
     */
    public function index(Request $request): Response
    {
        $symbol = strtoupper((string) $request->query('symbol', ''));

        if (! $this->gex->supports($symbol)) {
            $symbol = $this->gex->defaultSymbol();
        }

        $analysis = $this->gex->analysis($symbol);

        return Inertia::render('gex/index', [
            'catalog' => $this->gex->catalog(),
            'symbol' => $symbol,
            'analysis' => $analysis === [] ? null : $analysis,
        ]);
    }
}
