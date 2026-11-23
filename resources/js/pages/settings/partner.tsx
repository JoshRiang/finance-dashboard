import { Head } from '@inertiajs/react';
import { KeyRound, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function PartnerConsole({
    token,
    endpoints,
}: {
    token: string;
    endpoints: { me: string; admin: string };
}) {
    const [bearer, setBearer] = useState(token);
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState<string | null>(null);

    const call = async (url: string) => {
        setLoading(url);
        setResponse('');

        try {
            const result = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${bearer.trim()}`,
                },
                credentials: 'same-origin',
            });

            const text = await result.text();

            try {
                setResponse(JSON.stringify(JSON.parse(text), null, 2));
            } catch {
                setResponse(text);
            }
        } catch {
            setResponse('Permintaan gagal.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <>
            <Head title="Integrasi" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Partner API"
                    description="Kelola token integrasi dan uji endpoint mitra."
                />

                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label>Token akses (contoh)</Label>
                        <Badge variant="outline">HS256</Badge>
                    </div>
                    <textarea
                        readOnly
                        value={token}
                        className="h-24 w-full resize-none rounded-lg border bg-muted/40 p-2 font-mono text-[11px] break-all"
                    />
                </div>

                <div className="grid gap-2">
                    <Label>Uji token</Label>
                    <textarea
                        value={bearer}
                        onChange={(event) => setBearer(event.target.value)}
                        spellCheck={false}
                        className="h-24 w-full resize-none rounded-lg border bg-background p-2 font-mono text-[11px] break-all"
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => call(endpoints.me)}
                            disabled={loading !== null}
                        >
                            {loading === endpoints.me ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            GET /me
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => call(endpoints.admin)}
                            disabled={loading !== null}
                        >
                            {loading === endpoints.admin ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <KeyRound className="size-4" />
                            )}
                            GET /admin
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>Respons</Label>
                    <pre className="max-h-64 min-h-24 overflow-auto rounded-lg border bg-neutral-950 p-3 font-mono text-xs whitespace-pre-wrap text-neutral-200">
                        {response || 'Belum ada permintaan.'}
                    </pre>
                </div>

                <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Endpoint</p>
                    <p className="font-mono">GET {endpoints.me}</p>
                    <p className="font-mono">GET {endpoints.admin}</p>
                    <p>
                        Gunakan header <code>Authorization: Bearer &lt;token&gt;</code>.
                    </p>
                </div>
            </div>
        </>
    );
}