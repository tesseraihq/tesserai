<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        @include('partials.head')
    </head>
    <body class="min-h-screen bg-zinc-50 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <flux:header container class="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
            <flux:brand href="{{ route('dashboard') }}" name="Greenline Rota" />
            <flux:navbar class="-mb-px">
                <flux:navbar.item icon="calendar" :href="route('dashboard')" :current="request()->routeIs('dashboard')" wire:navigate>
                    {{ __('Rota') }}
                </flux:navbar.item>
            </flux:navbar>
            <flux:spacer />
            <flux:profile :initials="auth()->user()->initials()" />
        </flux:header>

        <flux:main container>
            {{ $slot }}
        </flux:main>

        @fluxScripts
    </body>
</html>
