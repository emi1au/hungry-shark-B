
import React, { useState, useMemo } from 'react';
import { CartItem, ModifierOption, Category, CustomerDetails, OrderType } from '../types';
import { isInlineModifier, getModifierPriority, getModifierSuperGroup } from '../utils/modifierUtils';

import { Printer, X, FileText, Copy, CheckCircle2 } from 'lucide-react';

interface ReceiptProps {
  items: CartItem[];
  total: number;
  orderNumber: number;
  date: Date;
  onClose: () => void;
  isOpen: boolean;
  paymentInfo?: {
    method: 'Cash' | 'Card';
    tendered?: number;
    change?: number;
  };
  onReprint?: (copies?: number) => void;
  customer?: CustomerDetails;
  orderType?: OrderType;
}

// Define specific order for receipt categories
const CATEGORY_PRIORITY = [
  Category.FISH,
  Category.BURGERS,
  Category.WRAPS,
  Category.KEBABS,
  Category.BITES,
  Category.KIDS_MEALS,
  Category.CHICKEN,
  Category.SIDES,
  Category.CHIPS,
  Category.SAUSAGES,
  Category.PIES,
  Category.DRINKS,
  Category.POTS
];



export const Receipt: React.FC<ReceiptProps> = ({ 
  items, 
  total, 
  orderNumber, 
  date, 
  onClose, 
  isOpen, 
  onReprint,
  customer,
  orderType
}) => {
  const [paperWidth, setPaperWidth] = useState<'57mm' | '80mm'>('80mm');
  const [doublePrint, setDoublePrint] = useState(false);

  // Sort by Category
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const catA = CATEGORY_PRIORITY.indexOf(a.category);
      const catB = CATEGORY_PRIORITY.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  // Group by category
  const itemsByCategory = useMemo(() => {
      const groups: Record<string, CartItem[]> = {};
      sortedItems.forEach(item => {
          if (!groups[item.category]) groups[item.category] = [];
          groups[item.category].push(item);
      });
      return groups;
  }, [sortedItems]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const copies = doublePrint ? 2 : 1;
    if (onReprint) {
      onReprint(copies);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      <style>{`
        @media print {
          body > *:not(.receipt-print-container) {
            display: none !important;
          }
          .receipt-print-container {
            display: flex !important;
            justify-content: center;
            align-items: flex-start;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            background: white;
            z-index: 9999;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0;
            size: auto; 
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="receipt-print-container bg-white md:rounded-xl shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh] w-full md:w-auto">
        
        {/* Screen Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print shrink-0">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              <h2 className="font-bold">Receipt Preview</h2>
            </div>
            
            <div className="flex bg-slate-800 rounded-lg p-1 text-xs font-medium">
               <button 
                 onClick={() => setPaperWidth('57mm')}
                 className={`px-3 py-1.5 rounded-md transition-all ${paperWidth === '57mm' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                 57mm
               </button>
               <button 
                 onClick={() => setPaperWidth('80mm')}
                 className={`px-3 py-1.5 rounded-md transition-all ${paperWidth === '80mm' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                 80mm
               </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="overflow-y-auto p-8 bg-slate-100 flex justify-center flex-1">
           {/* Receipt Paper */}
           <div 
             className="bg-white shadow-xl p-6 text-black"
             style={{ 
               width: paperWidth === '57mm' ? '58mm' : '80mm',
               minHeight: '100mm',
               fontFamily: 'Arial, Helvetica, sans-serif',
               lineHeight: '1.5',
             }}
           >
              {/* Header Line */}
              <div className="flex justify-between items-end text-[13px] mb-2">
                <span>Hungry Shark</span>
                <span>Time: {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
              </div>

              {/* Black Line Separator */}
              <div className="border-b border-black mb-4"></div>

              {/* Order Number */}
              <div className="text-center mb-4">
                <div className="text-[13px] font-medium mb-1 uppercase">ORDER NUMBER:</div>
                <div className="text-[42px] font-bold leading-none tracking-tight">B{orderNumber}</div>
              </div>

              {/* Black Line Separator */}
              <div className="border-b border-black mb-4"></div>

              {/* Delivery Info */}
              {orderType === 'Delivery' && customer && (
                  <div className="mb-4">
                      <p className="uppercase mb-2 text-[11px] tracking-wider">CUSTOMER INFO:</p>
                      <p className="text-[15px] font-bold mb-1">{customer.phone}</p>
                      <p className="text-[15px]">{customer.address}</p>
                      <p className="text-[15px]">{customer.postcode}</p>
                      <div className="border-b border-black mt-4 mb-4"></div>
                  </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                {CATEGORY_PRIORITY.map((cat) => {
                    const catItems = itemsByCategory[cat];
                    if (!catItems || catItems.length === 0) return null;

                    return (
                        <div key={cat}>
                            <div>
                            {catItems.map((item, iIdx) => {
                                let displayName = item.name;
                                let displayModifiers = [...item.modifiers];

                                if (cat === Category.DRINKS) {
                                    if (displayModifiers.length > 0) {
                                        displayName = `(${displayModifiers[0].name})`;
                                        displayModifiers = displayModifiers.slice(1);
                                    } else {
                                        displayName = `(${displayName})`;
                                    }
                                } else if (cat === Category.POTS) {
                                    if (displayName.toLowerCase().includes('sauce pot')) {
                                        const flavorIdx = displayModifiers.findIndex(m => !['Small', 'Large'].includes(m.name));
                                        if (flavorIdx !== -1) {
                                            displayName = displayModifiers[flavorIdx].name;
                                            displayModifiers.splice(flavorIdx, 1);
                                        }
                                    } else if (displayName.toLowerCase().includes('dip')) {
                                        const flavorIdx = displayModifiers.findIndex(m => !['Small', 'Large'].includes(m.name));
                                        if (flavorIdx !== -1) {
                                            displayName = `Dips (${displayModifiers[flavorIdx].name})`;
                                            displayModifiers.splice(flavorIdx, 1);
                                        }
                                    }
                                }

                                let itemTotal = 0;
                                if (item.manualPrice !== undefined) {
                                    itemTotal = item.manualPrice * item.quantity;
                                } else {
                                    const modsCost = item.modifiers.reduce((s, m) => s + m.price, 0);
                                    itemTotal = (item.price + modsCost) * item.quantity;
                                }
                                
                                const sizeModifiers = displayModifiers.filter(m => isInlineModifier(m.groupId, item.name));
                                const otherModifiers = displayModifiers.filter(m => !isInlineModifier(m.groupId, item.name));
                                
                                const sizeText = sizeModifiers.map(m => {
                                    const superGroup = getModifierSuperGroup(m.groupId);
                                    if (superGroup === 'add_chips' || superGroup === 'type') {
                                        return `(${m.name})`;
                                    }
                                    if (superGroup === 'size') {
                                        if (cat === Category.BURGERS) {
                                            return `(${m.name})`;
                                        }
                                        return `- ${m.name}`;
                                    }
                                    return `(${m.name})`;
                                }).join(' ');
                                
                                // Sort modifiers
                                otherModifiers.sort((a, b) => getModifierPriority(a.groupId) - getModifierPriority(b.groupId));

                                const specialMods = otherModifiers.filter(m => 
                                    getModifierSuperGroup(m.groupId) === 'size' ||
                                    m.groupId === 'meal_drinks' ||
                                    m.groupId === 'kids_drink_select' ||
                                    m.groupId === 'side_add_chips' ||
                                    m.name.toLowerCase().includes('meal') || 
                                    m.name.toLowerCase().includes('on chips') ||
                                    m.name === 'Burger Only' ||
                                    m.name === 'Wrap Only'
                                );
                                const normalMods = otherModifiers.filter(m => !specialMods.includes(m));

                                // Group modifiers
                                const groupedModifiers = new Map<string, ModifierOption[]>();
                                normalMods.forEach(m => {
                                    const key = getModifierSuperGroup(m.groupId);
                                    if(!groupedModifiers.has(key)) groupedModifiers.set(key, []);
                                    groupedModifiers.get(key)?.push(m);
                                });
                                
                                const modifierGroups = Array.from(groupedModifiers.values());

                                return (
                                    <div key={`i-${iIdx}`} className="mb-4">
                                        <div className="flex justify-between items-start text-[14px] leading-relaxed mb-1">
                                            <span className="font-normal pr-2">
                                                {item.quantity} x {displayName} {sizeText}
                                            </span>
                                            <span className="font-normal">{itemTotal.toFixed(2)}</span>
                                        </div>
                                        {otherModifiers.length > 0 && (
                                            <div className="leading-relaxed text-slate-700 pl-4">
                                                {specialMods.map((m, idx) => {
                                                    if (m.groupId === 'meal_drinks' || m.groupId === 'kids_drink_select') {
                                                        return (
                                                            <div key={`special-${idx}`} className="mb-0.5 text-[12px] text-black">
                                                                + Meal - {m.name}
                                                            </div>
                                                        );
                                                    } else if (m.name === 'Meal' || m.name === 'Burger Only' || m.name === 'Wrap Only') {
                                                        return null;
                                                    } else {
                                                        return (
                                                            <div key={`special-${idx}`} className="mb-0.5 text-[12px] text-black">
                                                                + {m.name}
                                                            </div>
                                                        );
                                                    }
                                                })}
                                                {modifierGroups.map((mods, mIdx) => {
                                                    const hasMealOrOnChips = specialMods.some(m => 
                                                        m.groupId === 'meal_drinks' || 
                                                        m.groupId === 'kids_drink_select' || 
                                                        m.groupId === 'side_add_chips' ||
                                                        m.name.toLowerCase().includes('on chips')
                                                    );
                                                    const plClass = hasMealOrOnChips ? 'pl-4' : '';
                                                    return (
                                                        <div key={mIdx} className={`mb-0.5 text-[12px] text-black ${plClass}`}>
                                                            + ({mods.map(m => m.name).join(', ')})
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {item.instructions && (
                                            <div className="text-[12px] leading-relaxed text-slate-700 pl-4 mt-0.5 italic">
                                                Note: {item.instructions}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    );
                })}
              </div>

              {/* Total Section */}
              <div className="border-t border-black border-dashed pt-2 mt-2">
                  <div className="flex justify-between items-end mt-2">
                     <span className="text-[11px] uppercase tracking-wider">TOTAL</span>
                     <span className="text-[16px]">{total.toFixed(2)}</span>
                  </div>
              </div>

           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center gap-3 no-print shrink-0">
          <button
            onClick={() => setDoublePrint(!doublePrint)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${doublePrint ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            {doublePrint ? <CheckCircle2 size={20} className="text-blue-600" /> : <Copy size={20} />}
            {doublePrint ? 'Double Print (x2)' : 'Single Print'}
          </button>

          <div className="flex gap-3">
            <button 
                onClick={onClose} 
                className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
                Done
            </button>
            <button 
                onClick={handlePrint} 
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
            >
                <Printer size={20} />
                {onReprint ? `Print (${doublePrint ? 'x2' : 'x1'})` : 'Print'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

