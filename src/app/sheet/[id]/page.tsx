import SheetView from '@/components/SheetView';

export default function Page({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <SheetView sheetId={params.id} />
    </main>
  );
}
