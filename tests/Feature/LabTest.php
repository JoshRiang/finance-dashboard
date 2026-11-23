<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Jwt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LabTest extends TestCase
{
    use RefreshDatabase;

    public function test_diagnostics_requires_authentication()
    {
        $this->get(route('system.diagnostics'))->assertRedirect(route('login'));
    }

    public function test_partner_console_requires_authentication()
    {
        $this->get(route('partner.console'))->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_open_the_diagnostics_page()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('system.diagnostics'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/system')
                ->has('lookupUrl')
            );
    }

    public function test_partner_console_issues_a_token()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('partner.console'))->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('settings/partner')
            ->has('token')
            ->has('endpoints.me')
            ->has('endpoints.admin')
        );

        $token = $response->viewData('page')['props']['token'];

        $this->assertSame(3, count(explode('.', $token)));
    }

    public function test_partner_me_accepts_a_valid_token()
    {
        $token = Jwt::encode([
            'sub' => 1,
            'role' => 'partner',
        ], (string) config('lab.jwt_secret'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('partner.me'))
            ->assertOk()
            ->assertJsonPath('authenticated', true)
            ->assertJsonPath('claims.role', 'partner');
    }

    public function test_partner_admin_rejects_a_non_admin_token()
    {
        $token = Jwt::encode([
            'sub' => 1,
            'role' => 'partner',
        ], (string) config('lab.jwt_secret'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('partner.admin'))
            ->assertForbidden();
    }

    public function test_partner_admin_accepts_a_token_forged_with_the_weak_secret()
    {
        $token = Jwt::encode([
            'sub' => 1,
            'role' => 'admin',
        ], (string) config('lab.jwt_secret'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('partner.admin'))
            ->assertOk()
            ->assertJsonPath('secret', (string) config('lab.admin_secret'));
    }

    public function test_partner_me_accepts_an_unsigned_token()
    {
        $header = $this->base64Url(json_encode(['alg' => 'none', 'typ' => 'JWT']));
        $payload = $this->base64Url(json_encode(['sub' => 1, 'role' => 'admin']));
        $token = $header.'.'.$payload.'.';

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('partner.me'))
            ->assertOk()
            ->assertJsonPath('claims.role', 'admin');
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
