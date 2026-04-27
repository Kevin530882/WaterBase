<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('expo_push_token')->nullable()->after('profile_photo');
            $table->string('push_token_platform', 16)->nullable()->after('expo_push_token');
            $table->string('push_token_app_version', 32)->nullable()->after('push_token_platform');
            $table->timestamp('push_token_updated_at')->nullable()->after('push_token_app_version');
            $table->boolean('push_notifications_enabled')->default(true)->after('push_token_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'expo_push_token',
                'push_token_platform',
                'push_token_app_version',
                'push_token_updated_at',
                'push_notifications_enabled',
            ]);
        });
    }
};
