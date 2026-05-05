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

    'waterbase_push' => [
        'enabled' => env('WATERBASE_PUSH_NOTIFICATIONS_ENABLED', false),
        'provider_url' => env('EXPO_PUSH_API_URL', 'https://exp.host/--/api/v2/push/send'),
        'allowed_types' => array_values(array_filter(array_map(
            static fn ($value) => trim((string) $value),
            explode(',', (string) env('WATERBASE_PUSH_ALLOWED_TYPES', 'event_created,event_ongoing,event_completed,report_status_changed,report_processing_failed'))
        ))),
    ],

    'waterbase_mqtt' => [
        'host' => env('WATERBASE_MQTT_HOST', 'localhost'),
        'port' => (int) env('WATERBASE_MQTT_PORT', 8883),
        'username' => env('WATERBASE_MQTT_USERNAME'),
        'password' => env('WATERBASE_MQTT_PASSWORD'),
        'client_id' => env('WATERBASE_MQTT_CLIENT_ID', 'waterbase-laravel-bridge'),
        'use_tls' => env('WATERBASE_MQTT_USE_TLS', true),
        'ca_file' => env('WATERBASE_MQTT_CA_FILE'),
        'keep_alive_interval' => (int) env('WATERBASE_MQTT_KEEP_ALIVE', 30),
        'connect_timeout' => (int) env('WATERBASE_MQTT_CONNECT_TIMEOUT', 10),
        'socket_timeout' => (int) env('WATERBASE_MQTT_SOCKET_TIMEOUT', 10),
        'resend_timeout' => (int) env('WATERBASE_MQTT_RESEND_TIMEOUT', 10),
        'topic_prefix' => env('WATERBASE_MQTT_TOPIC_PREFIX', 'waterbase/devices'),
    ],

];
