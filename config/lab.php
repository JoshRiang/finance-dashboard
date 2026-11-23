<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Security Lab Mode
    |--------------------------------------------------------------------------
    |
    | This application is intentionally vulnerable for security training.
    | LAB_MODE enables the deliberately unsafe diagnostics and partner API
    | features. Never enable this on a public or production deployment.
    |
    */

    'enabled' => env('LAB_MODE', false),

    'jwt_secret' => env('LAB_JWT_SECRET', 'partner-secret-2024'),

    'jwt_accept_none' => env('LAB_JWT_ACCEPT_NONE', true),

    'admin_secret' => env('LAB_ADMIN_SECRET', 'FLAG{insecure_jwt}'),

];
