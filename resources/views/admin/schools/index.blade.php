@extends('layouts.app')

@section('title', 'Gestion des écoles')

@section('content')

<div class="flex items-center justify-between mb-6">
    <div>
        <h3 class="text-lg font-bold text-slate-800">Toutes les écoles</h3>
        <p class="text-sm text-slate-400">{{ $schools->count() }} école(s) enregistrée(s)</p>
    </div>
    <a href="{{ route('admin.schools.create') }}" class="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition shadow-md shadow-indigo-200">
        <i class="fas fa-plus mr-2"></i> Ajouter
    </a>
</div>

<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <table class="w-full">
        <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
                <th class="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">École</th>
                <th class="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Téléphone</th>
                <th class="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Directeur</th>
                <th class="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-4">Actions</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            @forelse($schools as $school)
            <tr class="hover:bg-slate-50 transition">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {{ strtoupper(substr($school->name, 0, 1)) }}
                        </div>
                        <div class="ml-3">
                            <p class="font-semibold text-slate-800">{{ $school->name }}</p>
                            <p class="text-xs text-slate-400">{{ $school->email ?? 'Pas d\'email' }}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">{{ $school->phone ?? '—' }}</td>
                <td class="px-6 py-4">
                    @if($school->admin)
                        <span class="inline-flex items-center text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                            <i class="fas fa-circle text-xs mr-2"></i> {{ $school->admin->name }}
                        </span>
                    @else
                        <span class="text-sm text-slate-400">Non défini</span>
                    @endif
                </td>
                <td class="px-6 py-4 text-right">
                    <a href="{{ route('admin.schools.edit', $school) }}" class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
                        <i class="fas fa-pen"></i>
                    </a>
                    <form action="{{ route('admin.schools.destroy', $school) }}" method="POST" class="inline-block" onsubmit="return confirm('Supprimer ?')">
                        @csrf @method('DELETE')
                        <button class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </form>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="4" class="px-6 py-16 text-center">
                    <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-school text-slate-400 text-2xl"></i>
                    </div>
                    <p class="text-slate-500 font-semibold">Aucune école enregistrée</p>
                    <p class="text-sm text-slate-400 mt-1">Cliquez sur "Ajouter" pour commencer</p>
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>

@endsection