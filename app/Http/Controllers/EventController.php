<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Event;
use Illuminate\Validation\Rules\Enum;
use App\Enums\EventStatus;

class EventController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Event::query();
            
            // Filter by user_id if provided
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }
            
            $events = $query->orderBy('created_at', 'desc')->get();
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
            'latitude'=> 'required|numeric',
            'longitude'=> 'required|numeric',
            'date' => 'required|date',
            'time' => 'required|date_format:H:i',
            'duration' => 'required|numeric|min:0.1|max:24',
            'description' => 'required|string',
            'maxVolunteers' => 'required|integer|min:1',
            'points' => 'required|integer|min:0',
            'badge' => 'required|string',
            'status' => ['sometimes', new Enum(EventStatus::class)],
            'user_id' => 'required|integer|exists:users,id',
        ]);

        // Set default status if not provided
        if (!isset($validated['status'])) {
            $validated['status'] = 'recruiting';
        }

        $event = Event::create($validated);
        return response()->json([
            'success' => 'Event Created Successfully',
            'event' => $event
        ], 201);
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
            
            // Check if user owns this event
            if ($event->user_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'date' => 'sometimes|required|date',
                'time' => 'sometimes|required|date_format:H:i',
                'duration' => 'sometimes|required|numeric|min:0.1|max:24',
                'description' => 'sometimes|nullable|string',
                'maxVolunteers' => 'sometimes|required|integer|min:1',
                'points' => 'sometimes|required|integer|min:0',
                'badge' => 'sometimes|nullable|string|max:255',
                'status' => ['sometimes', new Enum(EventStatus::class)],
            ]);

            $event->update($validated);
            return response()->json([
                'success' => 'Event Updated Successfully',
                'event' => $event->fresh()
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function destroy(string $id)
    {
        try {
            $event = Event::findOrFail($id);
            
            // Check if user owns this event
            if ($event->user_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $event->delete();
            return response()->json(['success' => 'Event Deleted Successfully'], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function join(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $user = auth()->user();
            
            // Check if event is still recruiting
            if ($event->status !== 'recruiting') {
                return response()->json(['message' => 'This event is no longer accepting volunteers'], 400);
            }
            
            // Check if user is already joined
            if ($event->attendees()->where('user_id', $user->id)->exists()) {
                return response()->json(['message' => 'You have already joined this event'], 400);
            }
            
            // Check if event is full
            $currentVolunteers = $event->attendees()->count();
            if ($currentVolunteers >= $event->maxVolunteers) {
                return response()->json(['message' => 'This event is full'], 400);
            }
            
            // Add user to event
            $event->attendees()->attach($user->id, [
                'joined_at' => now(),
            ]);
            
            // Update current volunteer count
            $event->currentVolunteers = $currentVolunteers + 1;
            $event->save();
            
            return response()->json([
                'message' => 'Successfully joined the event',
                'event' => $event->load('attendees')
            ]);
            
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function getUserEvents(Request $request)
    {
        try {
            $user = auth()->user();
            
            // Get events the user has joined
            $joinedEvents = $user->attendedEvents()
                ->with('creator')
                ->orderBy('date', 'desc')
                ->get();
            
            return response()->json($joinedEvents);
            
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch user events'], 500);
        }
    }
}