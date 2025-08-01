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
        Schema::table('users', function (Blueprint $table) {
            $table->double('bbox_south')->nullable();
            $table->double('bbox_north')->nullable();
            $table->double('bbox_west')->nullable();
            $table->double('bbox_east')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['bbox_south', 'bbox_north', 'bbox_west', 'bbox_east']);
        });
    }
};
