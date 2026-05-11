<?php

namespace App\Http\Controllers;

use App\Models\ManualReportDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ManualReportDocumentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = ManualReportDocument::with([
            'uploader:id,firstName,lastName,email,organization,role',
            'reviewer:id,firstName,lastName,email',
        ])->latest();

        if (!in_array(strtolower((string) $user->role), ['admin', 'researcher'], true)) {
            $query->where('uploaded_by', $user->id);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array(strtolower((string) $user->role), ['ngo', 'lgu', 'admin'], true)) {
            return response()->json(['message' => 'Only NGO, LGU, and admin users can upload manual report PDFs.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'pdf_file' => 'required|file|mimes:pdf|max:20480',
        ]);

        $file = $request->file('pdf_file');
        $path = $file->store('manual_reports', 'public');

        $document = ManualReportDocument::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'organization_name' => $user->organization,
            'file_path' => Storage::url($path),
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/pdf',
            'file_size' => $file->getSize() ?: 0,
            'status' => 'pending',
            'uploaded_by' => $user->id,
        ]);

        return response()->json($document->load('uploader:id,firstName,lastName,email,organization,role'), 201);
    }

    public function update(Request $request, ManualReportDocument $manualReportDocument)
    {
        if (strtolower((string) $request->user()->role) !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'reviewed', 'rejected'])],
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $manualReportDocument->fill([
            'status' => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        return response()->json($manualReportDocument->fresh([
            'uploader:id,firstName,lastName,email,organization,role',
            'reviewer:id,firstName,lastName,email',
        ]));
    }

    public function destroy(Request $request, ManualReportDocument $manualReportDocument)
    {
        $user = $request->user();
        if ($manualReportDocument->uploaded_by !== $user->id && strtolower((string) $user->role) !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $path = str_replace('/storage/', '', $manualReportDocument->file_path);
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $manualReportDocument->delete();

        return response()->json(['message' => 'Manual report document deleted successfully']);
    }
}
