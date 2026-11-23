<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\NewsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NewsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_shows_a_news_preview()
    {
        $this->fakeFeeds();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->has('articles', 2)
                ->where('articles.0.title', 'Judul Berita Uji')
                ->where('articles.0.source', 'Antara News')
                ->where('total', 2)
            );
    }

    public function test_berita_page_lists_articles_from_the_feeds()
    {
        $this->fakeFeeds();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('berita'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('berita/index')
                ->has('articles', 2)
                ->where('articles.0.title', 'Judul Berita Uji')
                ->where('articles.0.image', 'https://example.com/gambar.jpg')
                ->where('articles.0.scope', 'domestic')
                ->where('scope', 'all')
                ->where('counts.domestic', 1)
                ->where('counts.international', 1)
            );
    }

    public function test_berita_page_can_be_filtered_by_scope()
    {
        $this->fakeFeeds();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('berita', ['scope' => 'international']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('berita/index')
                ->has('articles', 1)
                ->where('articles.0.title', 'Foreign Headline')
                ->where('articles.0.scope', 'international')
                ->where('scope', 'international')
            );

        $this->get(route('berita', ['scope' => 'domestic']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('berita/index')
                ->has('articles', 1)
                ->where('articles.0.title', 'Judul Berita Uji')
            );
    }

    public function test_article_detail_can_be_opened()
    {
        $this->fakeFeeds();

        $user = User::factory()->create();
        $this->actingAs($user);

        $id = app(NewsService::class)->idFor('https://example.com/berita-uji');

        $this->get(route('news.show', ['id' => $id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('news/show')
                ->where('article.title', 'Judul Berita Uji')
                ->where('article.url', 'https://example.com/berita-uji')
            );
    }

    public function test_unknown_article_returns_not_found()
    {
        $this->fakeFeeds();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('news.show', ['id' => 'tidak-ada']))->assertNotFound();
    }

    public function test_pages_still_render_when_feeds_fail()
    {
        Http::fake([
            '*' => Http::response('', 500),
        ]);

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->has('articles', 0)
                ->has('events', 0)
            );

        $this->get(route('berita'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('berita/index')
                ->has('articles', 0)
            );
    }

    private function fakeFeeds(): void
    {
        Http::fake([
            'https://www.antaranews.com/*' => Http::response($this->feed(), 200),
            'https://feeds.bbci.co.uk/*' => Http::response($this->internationalFeed(), 200),
            'https://nfs.faireconomy.media/*' => Http::response($this->calendarFeed(), 200),
            '*' => Http::response($this->emptyFeed(), 200),
        ]);
    }

    private function internationalFeed(): string
    {
        return <<<'XML'
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>BBC</title>
                    <item>
                        <title>Foreign Headline</title>
                        <link>https://example.com/foreign-berita</link>
                        <pubDate>Mon, 23 Nov 2026 10:00:00 +0000</pubDate>
                        <description>Ringkasan berita luar negeri.</description>
                    </item>
                </channel>
            </rss>
            XML;
    }

    private function feed(): string
    {
        return <<<'XML'
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>Antara News</title>
                    <item>
                        <title>Judul Berita Uji</title>
                        <link>https://example.com/berita-uji</link>
                        <pubDate>Mon, 23 Nov 2026 20:31:31 +0700</pubDate>
                        <description><![CDATA[<img src="https://example.com/gambar.jpg" /> Ringkasan berita uji.]]></description>
                        <media:content url="https://example.com/gambar.jpg" medium="image" xmlns:media="http://search.yahoo.com/mrss/" />
                    </item>
                </channel>
            </rss>
            XML;
    }

    private function emptyFeed(): string
    {
        return <<<'XML'
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>Empty</title>
                </channel>
            </rss>
            XML;
    }

    private function calendarFeed(): string
    {
        $date = now()->addDay()->format('m-d-Y');

        return <<<XML
            <?xml version="1.0" encoding="UTF-8"?>
            <weeklyevents>
                <event>
                    <title>Core Retail Sales q/q</title>
                    <country>NZD</country>
                    <date>{$date}</date>
                    <time>9:45pm</time>
                    <impact>High</impact>
                    <forecast>0.8%</forecast>
                    <previous>0.7%</previous>
                    <url>https://www.forexfactory.com/calendar/511-nz-core-retail-sales-qq</url>
                </event>
                <event>
                    <title>Low Impact Event</title>
                    <country>USD</country>
                    <date>{$date}</date>
                    <time>1:00am</time>
                    <impact>Low</impact>
                    <forecast></forecast>
                    <previous></previous>
                    <url>https://www.forexfactory.com/calendar/1</url>
                </event>
            </weeklyevents>
            XML;
    }
}
