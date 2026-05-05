<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_user', function (Blueprint $table) {
            $table->boolean('is_present')->default(false)->after('joined_at');
            $table->timestamp('qr_scanned_at')->nullable()->after('is_present');
        });
    }

    public function down(): void
    {
        Schema::table('event_user', function (Blueprint $table) {
            $table->dropColumn(['is_present', 'qr_scanned_at']);
        });
    }
};
