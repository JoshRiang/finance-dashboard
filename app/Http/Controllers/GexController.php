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
     * Show the dealer positioning overview.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('gex/index', $this->payload($request));
    }

    /**
     * Show the standalone skew-normal distribution chart.
     */
    public function distribution(Request $request): Response
    {
        return Inertia::render('gex/distribution', $this->payload($request));
    }

    /**
     * Show a dedicated page for a single exposure metric.
     */
    public function gamma(Request $request): Response
    {
        return $this->metric($request, 'gex', 'gamma');
    }

    public function delta(Request $request): Response
    {
        return $this->metric($request, 'dex', 'delta');
    }

    public function vanna(Request $request): Response
    {
        return $this->metric($request, 'vex', 'vanna');
    }

    public function charm(Request $request): Response
    {
        return $this->metric($request, 'chex', 'charm');
    }

    private function metric(Request $request, string $metric, string $slug): Response
    {
        return Inertia::render('gex/metric', array_merge($this->payload($request), [
            'metric' => $metric,
            'slug' => $slug,
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Request $request): array
    {
        $symbol = strtoupper((string) $request->query('symbol', ''));

        if (! $this->gex->supports($symbol)) {
            $symbol = $this->gex->defaultSymbol();
        }

        $analysis = $this->gex->analysis($symbol);

        return [
            'catalog' => $this->gex->catalog(),
            'symbol' => $symbol,
            'analysis' => $analysis === [] ? null : $analysis,
        ];
    }
}
