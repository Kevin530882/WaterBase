<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="/icon.png">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
    <title>WaterBase</title>
</head>

<body class="bg-gradient-to-br from-waterbase-50 to-enviro-50 min-h-screen">
    <div id="app"></div>
</body>

</html>