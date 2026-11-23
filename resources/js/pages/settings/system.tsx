import { Head } from '@inertiajs/react';
import { Loader2, Server } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SystemDiagnostics({
    lookupUrl,
}: {
    lookupUrl: string;
}) {
    const [host, setHost] = useState('example.com');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);

    const run = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setOutput('');

        try {
            const response = await fetch(
                `${lookupUrl}?host=${encodeURIComponent(host)}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );
            const data = (await response.json()) as { output?: string };

            setOutput(data.output ?? 'Tidak ada hasil.');
        } catch {
            setOutput('Gagal menjalankan pemeriksaan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Sistem" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Diagnostik Jaringan"
                    description="Periksa resolusi DNS server dan pastikan konektivitas berjalan normal."
                />

                <form onSubmit={run} className="space-y-3">
                    <div className="grid gap-2">
                        <Label htmlFor="host">Host / Domain</Label>
                        <div className="flex gap-2">
                            <Input
                                id="host"
                                value={host}
                                onChange={(event) =>
                                    setHost(event.target.value)
                                }
                                placeholder="example.com"
                                autoComplete="off"
                            />
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Server className="size-4" />
                                )}
                                Periksa
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Masukkan domain untuk melihat hasil resolusi
                            nslookup.
                        </p>
                    </div>
                </form>

                <div className="grid gap-2">
                    <Label>Keluaran</Label>
                    <pre className="max-h-72 min-h-32 overflow-auto rounded-lg border bg-neutral-950 p-3 font-mono text-xs whitespace-pre-wrap text-neutral-200">
                        {output || 'Belum ada pemeriksaan dijalankan.'}
                    </pre>
                </div>

                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Diagnostik hanya tersedia untuk pengguna terautentikasi dan
                    digunakan untuk pemeliharaan sistem.
                </div>
            </div>
        </>
    );
}