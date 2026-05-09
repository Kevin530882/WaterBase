<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserNotBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        if (method_exists($user, 'clearExpiredBan') && $user->clearExpiredBan()) {
            $user->refresh();
        }

        if (method_exists($user, 'isBanned') && $user->isBanned()) {
            return response()->json([
                'message' => $user->isTemporarilyBanned()
                    ? 'Your account is temporarily banned. Please try again later.'
                    : 'Your account has been banned. Please contact an administrator.',
            ], 403);
        }

        return $next($request);
    }
}