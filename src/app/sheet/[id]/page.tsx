import SheetView from '@/components/SheetView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-paper text-ink font-sans">
      <SheetView sheetId={id} />
    </main>
  );
}
