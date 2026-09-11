@extends('layouts.app')

@section('title', 'Tableau de bord')

@section('content')

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">

    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition">
        <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <i class="fas fa-school text-xl"></i>
            </div>
            <span class="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                <i class="fas fa-arrow-up mr-1"></i> Actif
            </span>
        </div>
        <h3 class="text-3xl font-bold text-slate-800 mt-4">{{ $stats['schools'] }}</h3>
        <p class="text-sm text-slate-400 mt-1">Écoles enregistrées</p>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition">
        <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                <i class="fas fa-user-tie text-xl"></i>
            </div>
        </div>
        <h3 class="text-3xl font-bold text-slate-800 mt-4">{{ $stats['admins'] }}</h3>
        <p class="text-sm text-slate-400 mt-1">Directeurs</p>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition">
        <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <i class="fas fa-users text-xl"></i>
            </div>
        </div>
        <h3 class="text-3xl font-bold text-slate-800 mt-4">{{ $stats['parents'] }}</h3>
        <p class="text-sm text-slate-400 mt-1">Parents</p>
    </div>

</div>

<div class="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
    <div class="relative z-10">
        <h3 class="text-2xl font-bold">Prêt à ajouter une nouvelle école ?</h3>
        <p class="text-indigo-100 mt-2">Créez un compte école + directeur en 30 secondes.</p>
        <a href="{{ route('admin.schools.create') }}" class="inline-flex items-center mt-5 bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition shadow-md">
            <i class="fas fa-plus mr-2"></i> Ajouter une école
        </a>
    </div>
    <i class="fas fa-school absolute right-8 top-1/2 -translate-y-1/2 text-white/10 text-9xl"></i>
</div>

@endsection