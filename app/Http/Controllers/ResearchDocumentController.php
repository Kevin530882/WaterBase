<?php

namespace App\Http\Controllers;

use App\Models\ResearchDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResearchDocumentController extends Controller
{
    public function index(Request $request)
    {
        $documents = ResearchDocument::with('user:id,firstName,lastName')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'pdf_file' => 'required|file|mimes:pdf|max:20480',
        ]);

        $file = $request->file('pdf_file');
        $path = $file->store('research_docs', 'public');

        $document = ResearchDocument::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'file_path' => Storage::url($path),
            'user_id' => $request->user()->id,
        ]);

        return response()->json($document, 201);
    }

    public function destroy(Request $request, string $id)
    {
        $document = ResearchDocument::findOrFail($id);

        if ($document->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $path = str_replace('/storage/', '', $document->file_path);
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }
}
