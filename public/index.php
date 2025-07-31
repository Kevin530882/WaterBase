<?php

// Increase memory limit for image processing
ini_set('memory_limit', '512M');
// Increase max execution time for heavy image processing
ini_set('max_execution_time', 120);
// Increase upload limits
ini_set('upload_max_filesize', '10M');
ini_set('post_max_size', '12M');

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__ . '/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__ . '/../bootstrap/app.php';

$app->handleRequest(Request::capture());
