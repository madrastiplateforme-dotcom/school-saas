<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>GestionEco - @yield('title', 'Accueil')</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-slate-50 font-sans antialiased">

<div class="min-h-screen flex">

    {{-- SIDEBAR --}}
    <aside class="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-slate-100">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                G
            </div>
            <div class="ml-3">
                <h1 class="font-bold text-slate-800 text-lg leading-tight">GestionEco</h1>
                <p class="text-xs text-slate-400">Plateforme scolaire</p>
            </div>
        </div>

        <nav class="flex-1 px-4 py-6 space-y-1">
            @auth
                @if(auth()->user()->role == 'super_admin')
                    <a href="{{ route('admin.dashboard') }}" class="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
                        <i class="fas fa-chart-pie w-5"></i>
                        <span class="ml-3">Tableau de bord</span>
                    </a>
                    <a href="{{ route('admin.schools.index') }}" class="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
                        <i class="fas fa-school w-5"></i>
                        <span class="ml-3">Écoles</span>
                    </a>
                @elseif(auth()->user()->role == 'school_admin')
                    <a href="{{ route('school.dashboard') }}" class="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
                        <i class="fas fa-chart-pie w-5"></i>
                        <span class="ml-3">Tableau de bord</span>
                    </a>
                @elseif(auth()->user()->role == 'parent')
                    <a href="{{ route('parent.dashboard') }}" class="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
                        <i class="fas fa-chart-pie w-5"></i>
                        <span class="ml-3">Tableau de bord</span>
                    </a>
                @endif
            @endauth
        </nav>

        @auth
        <div class="p-4 border-t border-slate-100">
            <div class="flex items-center">
                <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    {{ strtoupper(substr(auth()->user()->name, 0, 1)) }}
                </div>
                <div class="ml-3 flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{{ auth()->user()->name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ auth()->user()->email }}</p>
                </div>
            </div>
            <form method="POST" action="{{ route('logout') }}" class="mt-3">
                @csrf
                <button type="submit" class="w-full text-left text-sm text-slate-500 hover:text-red-500 flex items-center px-2 py-2 rounded-lg hover:bg-red-50 transition">
                    <i class="fas fa-sign-out-alt w-5"></i>
                    <span class="ml-3">Déconnexion</span>
                </button>
            </form>
        </div>
        @endauth
    </aside>

    {{-- CONTENU --}}
    <main class="flex-1 min-w-0">
        <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10">
            <div>
                <h2 class="text-xl font-bold text-slate-800">@yield('title', 'Tableau de bord')</h2>
                <p class="text-sm text-slate-400">Bienvenue sur GestionEco</p>
            </div>
            <div class="flex items-center gap-3">
                <button class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
                    <i class="fas fa-bell"></i>
                </button>
                <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    {{ auth()->check() ? strtoupper(substr(auth()->user()->name, 0, 1)) : 'G' }}
                </div>
            </div>
        </header>

        <div class="p-6 md:p-10">
            @if(session('success'))
                <div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center">
                    <i class="fas fa-check-circle mr-3"></i>
                    {{ session('success') }}
                </div>
            @endif

            @yield('content')
        </div>
    </main>
</div>

</body>
</html>