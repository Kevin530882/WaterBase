<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->text('content');
            $table->text('address');
            $table->decimal('latitude', 11, 8);
            $table->decimal('longitude', 11, 8);
            $table->string('pollutionType');
            $table->enum('status', ['pending', 'verified', 'resolved', 'declined'])->default('pending');
            $table->text('image');
            $table->enum('severityByUser', ['low', 'medium', 'high', 'critical']);
            $table->enum('severityByAI', ['low', 'medium', 'high', 'critical'])->default('low');
            $table->decimal('ai_confidence', 5, 2)->default(0.00);
            $table->decimal('severityPercentage', 5, 2)->default(0.00);
            $table->boolean("ai_verified")->default(false);
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
        DB::statement('ALTER TABLE reports MODIFY COLUMN image LONGBLOB');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
