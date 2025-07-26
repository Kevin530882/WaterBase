<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Event;
use Illuminate\Validation\Rules\Enum;
use App\Enums\EventStatus;

class EventController extends Controller
{
    public function index()
    {
        try {
            $events = Event::all();
            return response()->json($events);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'No events found'], 404);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'address'=> 'required|string',
            'latitude'=> 'required|decimal:1,11',
            'longitude'=> 'required|decimal:1,11',
            'date' => 'required|date',
            'time' => 'required|date_format:H:i',
            'duration' => 'required|integer',
            'description' => 'required|string',
            'maxVolunteers' => 'required|integer|min:1',
            'points' => 'required|integer|min:0',
            'badge' => 'required|string',
            'status' => ['required', new Enum(EventStatus::class)],
            'user_id' => 'required|integer|exists:users,id',
        ]);

        Event::create($validated);
        return response()->json(['success' => 'Event Created Successfully'], 201);
    }

    public function show(string $id)
    {
        try {
            $event = Event::findOrFail($id);
            return response()->json($event);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'address'=> 'required|string',
                'latitude'=> 'required|decimal:1,11',
                'longitude'=> 'required|decimal:1,11',
                'date' => 'required|date',
                'time' => 'required|date_format:H:i',
                'duration' => 'required|decimal:1,11',
                'description' => 'required|string',
                'maxVolunteers' => 'required|integer|min:1',
                'points' => 'required|integer|min:0',
                'badge' => 'required|string',
                'status' => ['required', new Enum(EventStatus::class)],
                'user_id' => 'required|integer|exists:users,id',
            ]);

            $event->update($validated);
            return response()->json(['success' => 'Event Updated Successfully'], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function destroy(string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $event->delete();
            return response()->json(['success' => 'Event Deleted Successfully'], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }
}
