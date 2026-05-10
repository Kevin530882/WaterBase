<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_cleanup_evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->longText('image');
            $table->longText('ai_annotated_image')->nullable();
            $table->decimal('latitude', 11, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('ai_severity')->nullable();
            $table->decimal('ai_confidence', 5, 2)->default(0);
            $table->decimal('pollution_percentage', 5, 2)->default(0);
            $table->boolean('ai_verified')->default(false);
            $table->string('result')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'result']);
            $table->index(['submitted_by', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_cleanup_evidences');
    }
};
