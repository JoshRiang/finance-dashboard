<?php

namespace App\Http\Controllers;

use App\Services\EconomicCalendarService;
use App\Services\MacroService;
use App\Services\NewsService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const PREVIEW_ARTICLES = 9;

    public function __construct(
        private readonly NewsService $news,
        private readonly EconomicCalendarService $calendar,
        private readonly MacroService $macro,
    ) {}

    /**
     * Show the dashboard with a news preview, macro data, and the economic calendar.
     */
    public function index(): Response
    {
        $articles = $this->news->all();

        return Inertia::render('dashboard', [
            'articles' => array_slice($articles, 0, self::PREVIEW_ARTICLES),
            'total' => count($articles),
            'events' => $this->calendar->upcoming(12),
            'macro' => Inertia::defer(fn (): array => $this->macro->overview()),
        ]);
    }
}
