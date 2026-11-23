<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GexTest extends TestCase
{
    use RefreshDatabase;

    public function test_gex_page_shows_dealer_positioning_for_the_default_asset()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('gex'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('gex/index')
                ->where('symbol', 'GLD')
                ->has('catalog', 16)
                ->where('analysis.symbol', 'GLD')
                ->where('analysis.spot', 336.2)
                ->where('analysis.spot_reference', 3625.5)
                ->where('analysis.reference_label', 'XAUUSD')
                ->has('analysis.strikes')
                ->has('analysis.expirations')
                ->has('analysis.flow')
            );
    }

    public function test_gex_page_can_switch_assets()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('gex', ['symbol' => 'SPY']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('gex/index')
                ->where('symbol', 'SPY')
                ->where('analysis.symbol', 'SPY')
                ->where('analysis.reference_label', null)
                ->where('analysis.spot', 690)
            );
    }

    public function test_unknown_symbol_falls_back_to_the_default_asset()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('gex', ['symbol' => 'ZZZ']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('symbol', 'GLD')
            );
    }

    public function test_gex_page_requires_authentication()
    {
        $this->get(route('gex'))->assertRedirect(route('login'));
    }

    public function test_gex_page_renders_when_option_data_is_unavailable()
    {
        Http::fake([
            '*' => Http::response('', 500),
        ]);

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('gex'))->assertOk();
    }

    private function fakeSources(): void
    {
        $nearest = now()->addDay()->startOfDay()->getTimestamp();
        $weekly = now()->addDays(8)->startOfDay()->getTimestamp();

        $contract = static fn (float $strike, int $oi, float $iv): array => [
            'strike' => $strike,
            'openInterest' => $oi,
            'impliedVolatility' => $iv,
            'volume' => 10,
            'bid' => 1.0,
            'ask' => 1.2,
            'lastPrice' => 1.1,
        ];

        $chain = [
            'optionChain' => [
                'result' => [[
                    'expirationDates' => [$nearest, $weekly],
                    'options' => [[
                        'expirationDate' => $nearest,
                        'calls' => [
                            $contract(330, 5000, 0.28),
                            $contract(340, 3000, 0.25),
                        ],
                        'puts' => [
                            $contract(330, 4000, 0.30),
                            $contract(320, 6000, 0.32),
                        ],
                    ]],
                ]],
                'error' => null,
            ],
        ];

        $chart = static fn (float $price): array => [
            'chart' => ['result' => [['meta' => ['regularMarketPrice' => $price]]]],
        ];

        Http::fake([
            'https://fc.yahoo.com*' => Http::response('', 200),
            'https://query1.finance.yahoo.com/v1/test/getcrumb*' => Http::response('testcrumb', 200),
            'https://query1.finance.yahoo.com/v7/finance/options/*' => Http::response($chain, 200),
            'https://query1.finance.yahoo.com/v8/finance/chart/GLD*' => Http::response($chart(336.2), 200),
            'https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF*' => Http::response($chart(3625.5), 200),
            'https://query1.finance.yahoo.com/v8/finance/chart/SPY*' => Http::response($chart(690.0), 200),
            '*' => Http::response('', 500),
        ]);
    }
}
