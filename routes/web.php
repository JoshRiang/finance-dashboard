<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GexController;
use App\Http\Controllers\MacroController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\PartnerApiController;
use App\Http\Controllers\SystemDiagnosticsController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('berita', [NewsController::class, 'index'])->name('berita');
    Route::get('news/{id}', [NewsController::class, 'show'])->name('news.show');
    Route::get('pasar', [MacroController::class, 'markets'])->name('pasar');
    Route::get('pasar/series', [MacroController::class, 'series'])->name('pasar.series');
    Route::get('pasar/distribution', [MacroController::class, 'distribution'])->name('pasar.distribution');
    Route::get('indikator', [MacroController::class, 'indicators'])->name('indikator');
    Route::get('indikator/{iso3}', [MacroController::class, 'country'])->name('indikator.show');
    Route::get('gex', [GexController::class, 'index'])->name('gex');
    Route::get('gex/distribution', [GexController::class, 'distribution'])->name('gex.distribution');
    Route::get('gex/gamma', [GexController::class, 'gamma'])->name('gex.gamma');
    Route::get('gex/delta', [GexController::class, 'delta'])->name('gex.delta');
    Route::get('gex/vanna', [GexController::class, 'vanna'])->name('gex.vanna');
    Route::get('gex/charm', [GexController::class, 'charm'])->name('gex.charm');

    Route::get('system/diagnostics', [SystemDiagnosticsController::class, 'index'])->name('system.diagnostics');
    Route::get('system/diagnostics/lookup', [SystemDiagnosticsController::class, 'lookup'])->name('system.diagnostics.lookup');
    Route::get('developer/partner', [PartnerApiController::class, 'console'])->name('partner.console');
});

Route::get('api/v1/partner/me', [PartnerApiController::class, 'me'])->name('partner.me');
Route::get('api/v1/partner/admin', [PartnerApiController::class, 'admin'])->name('partner.admin');

require __DIR__.'/settings.php';
