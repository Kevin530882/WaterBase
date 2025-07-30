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
            if (!Schema::hasColumn('reports', 'region_code')) {
                $table->string('region_code')->nullable()->after('longitude');
            }
            if (!Schema::hasColumn('reports', 'region_name')) {
                $table->string('region_name')->nullable()->after('region_code');
            }
            if (!Schema::hasColumn('reports', 'province_name')) {
                $table->string('province_name')->nullable()->after('region_name');
            }
            if (!Schema::hasColumn('reports', 'municipality_name')) {
                $table->string('municipality_name')->nullable()->after('province_name');
            }
            if (!Schema::hasColumn('reports', 'barangay_name')) {
                $table->string('barangay_name')->nullable()->after('municipality_name');
            }
            if (!Schema::hasColumn('reports', 'report_group_id')) {
                $table->foreignId('report_group_id')->nullable()->constrained()->after('barangay_name');
            }
            if (!Schema::hasColumn('reports', 'geocoded_at')) {
                $table->timestamp('geocoded_at')->nullable()->after('report_group_id');
            }
        });

        // Add indexes in a separate transaction
        try {
            Schema::table('reports', function (Blueprint $table) {
                $table->index(['region_code', 'province_name'], 'reports_region_province_idx');
                $table->index(['municipality_name', 'barangay_name'], 'reports_municipality_barangay_idx');
                $table->index(['latitude', 'longitude'], 'reports_coordinates_idx');
            });
        } catch (\Exception $e) {
            // Indexes might already exist, continue
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            try {
                $table->dropForeign(['report_group_id']);
            } catch (\Exception $e) {
                // Foreign key might not exist
            }

            try {
                $table->dropIndex('reports_region_province_idx');
                $table->dropIndex('reports_municipality_barangay_idx');
                $table->dropIndex('reports_coordinates_idx');
            } catch (\Exception $e) {
                // Indexes might not exist
            }

            $columnsToDrops = [
                'region_code',
                'region_name',
                'province_name',
                'municipality_name',
                'barangay_name',
                'report_group_id',
                'geocoded_at'
            ];

            foreach ($columnsToDrops as $column) {
                if (Schema::hasColumn('reports', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
