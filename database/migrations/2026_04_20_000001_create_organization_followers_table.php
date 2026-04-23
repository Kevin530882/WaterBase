<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_followers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organization_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['follower_user_id', 'organization_user_id'], 'org_followers_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_followers');
    }
};
