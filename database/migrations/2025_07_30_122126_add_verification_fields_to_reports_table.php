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
            // Address verification fields
            $table->enum('verification_status', ['pending', 'verified', 'flagged', 'suspicious'])
                ->default('pending')
                ->after('geocoded_at');

            $table->enum('verification_confidence', ['none', 'low', 'medium', 'high', 'error'])
                ->nullable()
                ->after('verification_status');

            $table->text('verification_notes')
                ->nullable()
                ->after('verification_confidence')
                ->comment('Notes from address verification process');

            $table->text('geocoded_address')
                ->nullable()
                ->after('verification_notes')
                ->comment('Address returned by reverse geocoding');

            $table->decimal('address_similarity', 3, 2)
                ->nullable()
                ->after('geocoded_address')
                ->comment('Similarity score between user address and geocoded address (0-1)');

            $table->integer('coordinate_distance')
                ->nullable()
                ->after('address_similarity')
                ->comment('Distance in meters between user address and coordinates');

            $table->timestamp('verification_at')
                ->nullable()
                ->after('coordinate_distance')
                ->comment('When the address verification was performed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn([
                'verification_status',
                'verification_confidence',
                'verification_notes',
                'geocoded_address',
                'address_similarity',
                'coordinate_distance',
                'verification_at'
            ]);
        });
    }
};
