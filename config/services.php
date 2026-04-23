<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'waterbase_notifications' => [
        'enabled' => env('WATERBASE_NOTIFICATIONS_ENABLED', true),
    ],

    'waterbase_forecast' => [
        'model_version' => env('WATERBASE_FORECAST_MODEL_VERSION', 'forecast-v1'),
        'rollback_version' => env('WATERBASE_FORECAST_ROLLBACK_VERSION', 'forecast-v0'),
        'retrain_schedule' => env('WATERBASE_FORECAST_RETRAIN_SCHEDULE', 'weekly'),
    ],

];
