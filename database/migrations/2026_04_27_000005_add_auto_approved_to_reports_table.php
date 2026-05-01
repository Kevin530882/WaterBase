<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->boolean('auto_approved')->default(false)->after('ai_verified')->comment('Tracks if report was automatically approved based on AI confidence and system settings');
            $table->timestamp('auto_approved_at')->nullable()->after('auto_approved')->comment('Timestamp when auto-approval occurred');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn(['auto_approved', 'auto_approved_at']);
        });
    }
};
