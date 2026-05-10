<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('cleanup_verification_status')->default('not_required')->after('ended_at');
            $table->timestamp('cleanup_verified_at')->nullable()->after('cleanup_verification_status');
            $table->foreignId('cleanup_verified_by')->nullable()->after('cleanup_verified_at')->constrained('users')->nullOnDelete();
            $table->text('cleanup_verification_notes')->nullable()->after('cleanup_verified_by');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['cleanup_verified_by']);
            $table->dropColumn([
                'cleanup_verification_status',
                'cleanup_verified_at',
                'cleanup_verified_by',
                'cleanup_verification_notes',
            ]);
        });
    }
};
