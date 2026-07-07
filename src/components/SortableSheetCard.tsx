import React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, GripHorizontal, Archive, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SortableSheetCard({ sheet, onArchiveToggle }: { sheet: any, onArchiveToggle?: (id: string, is_previous_year: boolean) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sheet._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onArchiveToggle) {
      onArchiveToggle(sheet.sheet_id, !sheet.is_previous_year);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ scale: 1 }}
      animate={{ scale: isDragging ? 1.05 : 1, boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.4)" : "none" }}
      whileHover={!isDragging ? { scale: 1.02 } : {}}
      className={`group h-full outline-none ${isDragging ? 'opacity-80' : 'opacity-100'}`}
    >
      <div className="glass-card rounded-[16px] p-6 h-full flex flex-col relative overflow-hidden group-focus:border-brand-magenta dark:group-focus:border-white shadow-ambient transition-all duration-300 hover:shadow-ambient-hover">
        
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3 relative z-20">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1.5 -ml-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-ink-muted hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors"
              title="Drag to reorder"
            >
              <GripHorizontal className="w-5 h-5" />
            </div>
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/60 dark:border-white/10">
              <FileSpreadsheet className="w-6 h-6 text-brand-indigo dark:text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-20">
            <div className="flex items-center gap-1.5 bg-white/40 dark:bg-white/5 backdrop-blur-sm border border-white/50 dark:border-white/10 px-3 py-1.5 rounded-full">
              <span className="text-xs font-bold text-brand-indigo dark:text-white uppercase tracking-wider">
                {sheet.total_entries} Classes
              </span>
            </div>
            <button 
              onClick={handleArchiveClick}
              className="p-1.5 rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-sm border border-white/50 dark:border-white/10 text-ink-muted hover:text-brand-magenta dark:text-white/60 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
              title={sheet.is_previous_year ? "Move to Home" : "Move to Previous Year"}
            >
              {sheet.is_previous_year ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold text-ink dark:text-white line-clamp-2 mb-3 group-hover:text-brand-indigo transition-hover relative z-10">
          <Link href={`/sheet/${sheet.sheet_id}`} className="outline-none before:absolute before:inset-0">
            {sheet.title}
          </Link>
        </h3>
        
        <div className="mt-auto pt-5 flex items-center justify-between border-t border-white/40 dark:border-white/10 relative z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            {sheet.error_count > 0 ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-coral">
                <AlertCircle className="w-5 h-5" />
                <span>{sheet.error_count} Errors</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span>All Valid</span>
              </div>
            )}
          </div>
          
          <div className="w-8 h-8 rounded-full bg-white/40 dark:bg-white/10 flex items-center justify-center group-hover:bg-brand-magenta-light dark:group-hover:bg-white transition-hover">
            <ChevronRight className="w-5 h-5 text-ink-muted dark:text-white/60 group-hover:text-brand-magenta dark:group-hover:text-black" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
