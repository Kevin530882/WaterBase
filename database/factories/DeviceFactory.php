<?php

namespace Database\Factories;

use App\Models\Device;
use Illuminate\Database\Eloquent\Factories\Factory;

class DeviceFactory extends Factory
{
    protected $model = Device::class;

    public function definition(): array
    {
        return [
            'mac_address' => strtoupper(implode(':', array_map(fn () => str_pad(dechex(mt_rand(0, 255)), 2, '0', STR_PAD_LEFT), range(1, 6)))),
            'station_id' => null,
            'name' => $this->faker->words(2, true),
            'status' => 'awaiting_pair',
            'firmware_version' => '1.0.0',
            'hardware_revision' => '1',
        ];
    }

    public function paired(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'station_id' => 'station-' . $this->faker->numberBetween(1000, 9999),
                'status' => 'paired',
                'paired_at' => now()->subDays(1),
                'paired_by_user_id' => 1,
            ];
        });
    }
}
