<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->string('mac_address')->unique();
            $table->string('station_id')->nullable()->unique();
            $table->string('name')->nullable();
            $table->string('status')->default('awaiting_pair');
            $table->foreignId('paired_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paired_at')->nullable();
            $table->timestamp('discovery_last_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->string('firmware_version')->nullable();
            $table->string('hardware_revision')->nullable();
            $table->json('raw_discovery_payload')->nullable();
            $table->timestamps();

            $table->index(['status', 'discovery_last_seen_at']);
            $table->index(['status', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};