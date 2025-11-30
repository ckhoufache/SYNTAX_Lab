import React from 'react';
import { Deal, DealStage } from '../types';
import { Plus, MoreHorizontal, DollarSign } from 'lucide-react';

interface PipelineProps {
  deals: Deal[];
}

export const Pipeline: React.FC<PipelineProps> = ({ deals }) => {
  const columns = [
    { id: DealStage.LEAD, title: 'Lead', color: 'bg-slate-500' },
    { id: DealStage.CONTACTED, title: 'Kontaktiert', color: 'bg-blue-500' },
    { id: DealStage.PROPOSAL, title: 'Angebot', color: 'bg-amber-500' },
    { id: DealStage.NEGOTIATION, title: 'Verhandlung', color: 'bg-purple-500' },
    { id: DealStage.WON, title: 'Gewonnen', color: 'bg-green-500' },
  ];

  const getDealsForStage = (stage: DealStage) => deals.filter(d => d.stage === stage);

  return (
    <div className="flex-1 bg-slate-50 h-screen flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Pipeline</h1>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Deal hinzufügen
        </button>
      </header>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map((col) => {
             const stageDeals = getDealsForStage(col.id as DealStage);
             const totalValue = stageDeals.reduce((acc, curr) => acc + curr.value, 0);

             return (
              <div key={col.id} className="w-80 flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${col.color}`} />
                    <h3 className="font-semibold text-slate-700">{col.title}</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                      {stageDeals.length}
                    </span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400 cursor-pointer" />
                </div>
                
                {/* Column Content (Scrollable) */}
                <div className="flex-1 bg-slate-100/50 rounded-xl p-2 border border-slate-200/60 overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            #{deal.id}
                          </span>
                          <button className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1 leading-snug">{deal.title}</h4>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
                           <span>Fällig: {deal.dueDate}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                           <div className="flex items-center text-slate-700 font-semibold text-sm">
                              <DollarSign className="w-3 h-3 text-slate-400 mr-1" />
                              {deal.value.toLocaleString('de-DE')}
                           </div>
                           <img src={`https://picsum.photos/seed/${deal.contactId}/30/30`} className="w-6 h-6 rounded-full ring-2 ring-white" alt="Contact" />
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                        Leer
                      </div>
                    )}
                  </div>
                </div>

                {/* Column Footer Summary */}
                <div className="mt-3 px-2 text-right">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Summe: </span>
                  <span className="text-sm font-bold text-slate-700">{totalValue.toLocaleString('de-DE')} €</span>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};