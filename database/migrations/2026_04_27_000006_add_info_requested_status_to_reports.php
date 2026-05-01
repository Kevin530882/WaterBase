<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the status enum to include 'info_requested'
        // Note: This uses raw SQL because Laravel doesn't have a built-in way to modify enum columns
        Schema::table('reports', function (Blueprint $table) {
            // First add a temporary column to hold the values during migration
            $table->string('status_temp')->nullable()->after('status');
        });
        
        // Copy existing values to temp column
        DB::table('reports')->update([
            'status_temp' => DB::raw('`status`')
        ]);
        
        // Drop the old enum column and recreate it with new values
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('status');
        });
        
        Schema::table('reports', function (Blueprint $table) {
            $table->enum('status', ['pending', 'verified', 'resolved', 'declined', 'info_requested'])->default('pending')->after('pollutionType');
        });
        
        // Restore the values from temp column
        DB::table('reports')->update([
            'status' => DB::raw('`status_temp`')
        ]);
        
        // Drop the temp column
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('status_temp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->string('status_temp')->nullable();
        });
        
        DB::table('reports')->update([
            'status_temp' => DB::raw('`status`')
        ]);
        
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('status');
        });
        
        Schema::table('reports', function (Blueprint $table) {
            $table->enum('status', ['pending', 'verified', 'resolved', 'declined'])->default('pending')->after('pollutionType');
        });
        
        DB::table('reports')->update([
            'status' => DB::raw('`status_temp`')
        ]);
        
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('status_temp');
        });
    }
};
