<?php

namespace App\Http\Controllers;

use App\Services\NewsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    public function __construct(private readonly NewsService $news) {}

    /**
     * Show every collected headline, optionally filtered by scope.
     */
    public function index(Request $request): Response
    {
        $scope = $request->query('scope');
        $scope = in_array($scope, [NewsService::SCOPE_DOMESTIC, NewsService::SCOPE_INTERNATIONAL], true)
            ? $scope
            : null;

        return Inertia::render('berita/index', [
            'articles' => $this->news->all($scope),
            'scope' => $scope ?? 'all',
            'counts' => $this->news->counts(),
        ]);
    }

    /**
     * Show a single article summary.
     */
    public function show(string $id): Response
    {
        $article = $this->news->find($id);

        abort_if($article === null, 404);

        return Inertia::render('news/show', [
            'article' => $article,
        ]);
    }
}
