<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (!Schema::hasColumn('reports', 'ai_confidence')) {
                $table->decimal('ai_confidence', 5, 2)->default(0.00)->after('severityByAI');
            }
        });
        DB::statement('ALTER TABLE reports MODIFY COLUMN image LONGBLOB');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (Schema::hasColumn('reports', 'ai_confidence')) {
                $table->dropColumn('ai_confidence');
            }
        });
    }
};
