<?php

namespace App\Http\Controllers;

use App\Support\Jwt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartnerApiController extends Controller
{
    public function console(Request $request): Response
    {
        abort_unless(config('lab.enabled'), 404);

        $user = $request->user();

        $token = Jwt::encode([
            'sub' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'partner',
            'iss' => 'partner-api',
            'iat' => now()->getTimestamp(),
            'exp' => now()->addDay()->getTimestamp(),
        ], (string) config('lab.jwt_secret'));

        return Inertia::render('settings/partner', [
            'token' => $token,
            'endpoints' => [
                'me' => url('/api/v1/partner/me'),
                'admin' => url('/api/v1/partner/admin'),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        abort_unless(config('lab.enabled'), 404);

        $claims = $this->claims($request);

        abort_if($claims === null, 401, 'Invalid token');

        return response()->json([
            'authenticated' => true,
            'claims' => $claims,
        ]);
    }

    public function admin(Request $request): JsonResponse
    {
        abort_unless(config('lab.enabled'), 404);

        $claims = $this->claims($request);

        abort_if($claims === null, 401, 'Invalid token');
        abort_if(($claims['role'] ?? '') !== 'admin', 403, 'Forbidden');

        return response()->json([
            'message' => 'Welcome, administrator.',
            'secret' => (string) config('lab.admin_secret'),
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function claims(Request $request): ?array
    {
        $header = (string) $request->header('Authorization', '');
        $token = str_starts_with($header, 'Bearer ')
            ? trim(substr($header, 7))
            : trim($header);

        if ($token === '') {
            return null;
        }

        return Jwt::decode(
            $token,
            (string) config('lab.jwt_secret'),
            (bool) config('lab.jwt_accept_none'),
        );
    }
}
