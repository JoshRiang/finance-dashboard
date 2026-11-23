<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MacroService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MacroTest extends TestCase
{
    use RefreshDatabase;

    public function test_markets_are_normalized_from_the_yahoo_chart_api()
    {
        $this->fakeSources();

        $markets = app(MacroService::class)->markets();

        $this->assertCount(23, $markets);
        $this->assertSame('^GSPC', $markets[0]['symbol']);
        $this->assertSame('S&P 500', $markets[0]['label']);
        $this->assertSame('Indeks', $markets[0]['group']);
        $this->assertSame('americas', $markets[0]['region']);
        $this->assertSame(105.0, $markets[0]['price']);
        $this->assertSame(5.0, $markets[0]['range_change']);
        $this->assertSame(1.5, $markets[0]['day_change']);
        $this->assertSame(120.0, $markets[0]['week_52_high']);
        $this->assertSame(90.0, $markets[0]['week_52_low']);
        $this->assertSame(1000000, $markets[0]['volume']);
        $this->assertCount(4, $markets[0]['points']);
    }

    public function test_overview_returns_a_dashboard_sized_slice()
    {
        $this->fakeSources();

        $overview = app(MacroService::class)->overview();

        $this->assertCount(8, $overview['markets']);
        $this->assertArrayHasKey('americas', $overview['indicators']);
        $this->assertArrayHasKey('world', $overview['indicators']);
        $this->assertCount(3, $overview['indicators']['americas']['series']);
        $this->assertCount(3, $overview['indicators']['world']['series']);
    }

    public function test_indicators_are_grouped_by_country()
    {
        $this->fakeSources();

        $indicators = app(MacroService::class)->indicators();

        $this->assertCount(3, $indicators);

        $gdp = $indicators['NY.GDP.MKTP.KD.ZG'];
        $this->assertSame('Pertumbuhan PDB', $gdp['label']);
        $this->assertSame('%', $gdp['unit']);

        $isos = array_column($gdp['countries'], 'iso3');
        $this->assertSame(['USA', 'WLD'], $isos);

        $usa = $gdp['countries'][0];
        $this->assertSame('Amerika Serikat', $usa['label']);
        $this->assertSame('us', $usa['flag']);
        $this->assertSame(2.5, $usa['latest']);
        $this->assertSame(2025, $usa['latest_year']);
        $this->assertSame([2024, 2025], array_column($usa['points'], 'year'));
    }

    public function test_pasar_page_shows_the_instrument_catalog()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('pasar'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('pasar/index')
                ->has('catalog', 23)
                ->where('catalog.0.label', 'S&P 500')
                ->where('catalog.0.group', 'Indeks')
                ->missing('catalog.0.points')
            );
    }

    public function test_series_endpoint_returns_points_for_a_timeframe()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->getJson(route('pasar.series', [
            'symbol' => '^GSPC',
            'timeframe' => '1D',
        ]))
            ->assertOk()
            ->assertJsonPath('symbol', '^GSPC')
            ->assertJsonPath('timeframe', '1D')
            ->assertJsonPath('price', 105)
            ->assertJsonCount(4, 'points');
    }

    public function test_series_endpoint_rejects_unknown_symbol_or_timeframe()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->getJson(route('pasar.series', ['symbol' => 'NOPE', 'timeframe' => '1Y']))
            ->assertNotFound();

        $this->getJson(route('pasar.series', ['symbol' => '^GSPC', 'timeframe' => '9Y']))
            ->assertNotFound();
    }

    public function test_indikator_page_shows_all_countries()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('indikator'))->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('indikator/index')
        );

        $indicators = $response->viewData('page')['props']['indicators'];

        $this->assertCount(3, $indicators);
        $this->assertArrayHasKey('FP.CPI.TOTL.ZG', $indicators);
        $this->assertSame('Inflasi', $indicators['FP.CPI.TOTL.ZG']['label']);
    }

    public function test_country_detail_page_shows_macro_indicators()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('indikator.show', ['iso3' => 'USA']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('indikator/show')
                ->where('country.iso3', 'USA')
                ->where('country.label', 'Amerika Serikat')
                ->where('country.flag', 'us')
                ->has('country.indicators', 3)
            );
    }

    public function test_country_detail_returns_not_found_for_unknown_country()
    {
        $this->fakeSources();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('indikator.show', ['iso3' => 'ZZZ']))->assertNotFound();
    }

    public function test_macro_pages_require_authentication()
    {
        $this->get(route('pasar'))->assertRedirect(route('login'));
        $this->get(route('indikator'))->assertRedirect(route('login'));
        $this->get(route('indikator.show', ['iso3' => 'USA']))->assertRedirect(route('login'));
    }

    public function test_macro_pages_render_when_sources_fail()
    {
        Http::fake([
            '*' => Http::response('', 500),
        ]);

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertOk();
        $this->get(route('pasar'))->assertOk();
        $this->get(route('indikator'))->assertOk();
    }

    private function fakeSources(): void
    {
        Http::fake([
            'https://query1.finance.yahoo.com/*' => Http::response($this->yahooPayload(), 200),
            'https://api.worldbank.org/*' => Http::response($this->worldBankPayload(), 200),
        ]);
    }

    private function yahooPayload(): string
    {
        return json_encode([
            'chart' => [
                'result' => [[
                    'meta' => [
                        'currency' => 'USD',
                        'shortName' => 'S&P 500',
                        'regularMarketChangePercent' => 1.5,
                        'fiftyTwoWeekHigh' => 120,
                        'fiftyTwoWeekLow' => 90,
                        'regularMarketVolume' => 1000000,
                    ],
                    'timestamp' => [1, 2, 3, 4, 5],
                    'indicators' => [
                        'quote' => [[
                            'close' => [100.0, 102.0, null, 101.0, 105.0],
                        ]],
                    ],
                ]],
                'error' => null,
            ],
        ]);
    }

    private function worldBankPayload(): string
    {
        $row = static fn (string $iso, string $country, int $year, float $value): array => [
            'indicator' => ['id' => 'NY.GDP.MKTP.KD.ZG', 'value' => 'GDP growth (annual %)'],
            'country' => ['id' => strtolower(substr($iso, 0, 2)), 'value' => $country],
            'countryiso3code' => $iso,
            'date' => (string) $year,
            'value' => $value,
        ];

        return json_encode([
            ['page' => 1, 'pages' => 1, 'per_page' => 500, 'total' => 4],
            [
                $row('USA', 'United States', 2025, 2.5),
                $row('USA', 'United States', 2024, 2.8),
                $row('WLD', 'World', 2025, 2.9),
                $row('WLD', 'World', 2024, 3.1),
            ],
        ]);
    }
}
