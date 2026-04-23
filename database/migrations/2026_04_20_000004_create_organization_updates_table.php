<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('content');
            $table->string('update_type')->default('update');
            $table->boolean('is_published')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['organization_user_id', 'published_at'], 'org_updates_org_published_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_updates');
    }
};
