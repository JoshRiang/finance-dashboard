<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EconomicCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_exposes_upcoming_high_and_medium_events_only()
    {
        Http::fake([
            'https://nfs.faireconomy.media/*' => Http::response($this->calendarFeed(), 200),
            '*' => Http::response('', 500),
        ]);

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->has('events', 2)
                ->where('events.0.title', 'CPI m/m')
                ->where('events.0.impact', 'High')
                ->where('events.0.country', 'USD')
                ->where('events.0.time', '13:30')
                ->where('events.0.datetime', now()->toDateString().'T13:30:00+00:00')
                ->where('events.1.title', 'Industrial Production m/m')
                ->where('events.1.impact', 'Medium')
            );
    }

    public function test_past_events_are_excluded()
    {
        Http::fake([
            'https://nfs.faireconomy.media/*' => Http::response($this->calendarFeed(), 200),
            '*' => Http::response('', 500),
        ]);

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $events = $response->viewData('page')['props']['events'];

        foreach ($events as $event) {
            $this->assertGreaterThanOrEqual(now()->toDateString(), $event['date']);
        }
    }

    private function calendarFeed(): string
    {
        $today = now()->format('m-d-Y');
        $past = now()->subDays(3)->format('m-d-Y');
        $next = now()->addDay()->format('m-d-Y');

        return <<<XML
            <?xml version="1.0" encoding="UTF-8"?>
            <weeklyevents>
                <event>
                    <title>Past Event</title>
                    <country>EUR</country>
                    <date>{$past}</date>
                    <time>10:00am</time>
                    <impact>High</impact>
                    <forecast>1.0%</forecast>
                    <previous>0.9%</previous>
                    <url>https://www.forexfactory.com/calendar/past</url>
                </event>
                <event>
                    <title>CPI m/m</title>
                    <country>USD</country>
                    <date>{$today}</date>
                    <time>1:30pm</time>
                    <impact>High</impact>
                    <forecast>0.3%</forecast>
                    <previous>0.2%</previous>
                    <url>https://www.forexfactory.com/calendar/cpi</url>
                </event>
                <event>
                    <title>Industrial Production m/m</title>
                    <country>GBP</country>
                    <date>{$next}</date>
                    <time>7:00am</time>
                    <impact>Medium</impact>
                    <forecast>0.1%</forecast>
                    <previous>-0.2%</previous>
                    <url>https://www.forexfactory.com/calendar/ip</url>
                </event>
                <event>
                    <title>Bank Holiday</title>
                    <country>JPY</country>
                    <date>{$next}</date>
                    <time>All Day</time>
                    <impact>Holiday</impact>
                    <forecast></forecast>
                    <previous></previous>
                    <url>https://www.forexfactory.com/calendar/holiday</url>
                </event>
            </weeklyevents>
            XML;
    }
}
