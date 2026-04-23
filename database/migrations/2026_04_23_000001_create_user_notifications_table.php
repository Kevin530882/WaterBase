<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 80);
            $table->string('channel', 32)->default('in_app');
            $table->string('severity', 16)->default('info');
            $table->string('title', 255);
            $table->text('message');
            $table->json('metadata')->nullable();
            $table->string('idempotency_key', 191)->nullable()->unique();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('last_error', 1024)->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'type', 'created_at']);
            $table->index(['user_id', 'read_at']);
            $table->index(['channel', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
    }
};
