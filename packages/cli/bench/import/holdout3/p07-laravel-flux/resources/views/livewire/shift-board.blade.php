<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <flux:heading size="xl">This week</flux:heading>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ $clinic->name }} · {{ $shifts->count() }} shifts</p>
        </div>
        <flux:button variant="primary" wire:click="publish">Publish rota</flux:button>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
        @foreach ($shifts as $shift)
            <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div class="text-sm text-zinc-500 dark:text-zinc-400">{{ $shift->starts_at->format('D H:i') }}</div>
                <div class="font-medium">{{ $shift->staff->name }}</div>
                <flux:badge size="sm" :color="$shift->confirmed ? 'lime' : 'amber'">
                    {{ $shift->confirmed ? 'Confirmed' : 'Pending' }}
                </flux:badge>
            </div>
        @endforeach
    </div>
</div>
