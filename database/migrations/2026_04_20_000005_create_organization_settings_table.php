<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('auto_accept_join_requests')->default(false);
            $table->timestamps();

            $table->unique('organization_user_id', 'org_settings_org_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_settings');
    }
};
