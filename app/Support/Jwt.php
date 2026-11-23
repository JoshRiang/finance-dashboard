<?php

namespace App\Support;

class Jwt
{
    /**
     * @param  array<string, mixed>  $claims
     */
    public static function encode(array $claims, string $secret): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];

        $segments = [
            self::base64UrlEncode(json_encode($header)),
            self::base64UrlEncode(json_encode($claims)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);

        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function decode(string $token, string $secret, bool $acceptNone = false): ?array
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $signature] = $segments;

        $header = json_decode(self::base64UrlDecode($encodedHeader), true);
        $payload = json_decode(self::base64UrlDecode($encodedPayload), true);

        if (! is_array($header) || ! is_array($payload)) {
            return null;
        }

        $algorithm = strtolower((string) ($header['alg'] ?? ''));

        if ($algorithm === 'none') {
            return $acceptNone ? $payload : null;
        }

        if ($algorithm !== 'hs256') {
            return null;
        }

        $expected = self::base64UrlEncode(
            hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $secret, true),
        );

        return hash_equals($expected, $signature) ? $payload : null;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
