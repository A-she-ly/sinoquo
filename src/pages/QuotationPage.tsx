import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { databaseService } from '../services/database';
import { Plus, Search, X, Download, FileText, Trash2, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartFloatingPanel } from '../components/CartFloatingPanel';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';

// Sortable Item Component
const SortableItem = ({ item, index, navigate, hoveredProduct, setHoveredProduct, user }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const { updateQuantity, updateCartItemPrice, updateCartItemDescription, removeFromCart, margin, exchangeRate, currency } = useStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 100 : 'auto',
  };

  const cost = item.costItem?.cost_price || item.cost_cny || 0;
  // If currency is USD and guide price exists, use it. Otherwise, calculate using margin as multiplier
  const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
      ? item.guide_price_usd 
      : Math.round((cost * margin) / exchangeRate);
      
  // For UI display, we use custom_price if it was manually set or recalculated by the store
  const unitPrice = item.custom_price ?? calculatedPrice;
  const subtotal = unitPrice * item.quantity;
  
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'AUD' ? 'A$' : currency === 'CNY' ? '¥' : '$';

  return (
    <div ref={setNodeRef} style={style} className="border-b border-gray-200 py-2 last:border-0 relative hover:bg-gray-50 transition-colors bg-white">
      <div className="flex gap-3 items-start pr-12">
        {/* Left: Index Number */}
        <div className="shrink-0 w-6 flex justify-center pt-1">
          <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
        </div>

        {/* Left: Description & Tip */}
        <div className="flex-[4] min-w-0">
          {/* Tip Display - Very Compact */}
          {((item as any).Tip || ((item.details || item.specs) && (item.details?.includes('Tip:') || item.specs?.includes('Tip:')))) && (
              <div className="bg-yellow-50 text-yellow-800 text-[10px] px-1.5 py-0.5 mb-1 truncate border-l-2 border-yellow-400" title={(item as any).Tip || (item.details?.includes('Tip:') ? item.details.split('Tip:')[1].split('\n')[0] : item.specs.split('Tip:')[1].split('\n')[0])}>
                 <span className="font-bold mr-1">💡</span> 
                 {(item as any).Tip || (item.details?.includes('Tip:') ? item.details.split('Tip:')[1].split('\n')[0] : item.specs.split('Tip:')[1].split('\n')[0])}
              </div>
          )}

          <div className="border border-gray-300 bg-white">
            <textarea
              className="w-full text-black text-xs font-sans resize-none focus:outline-none p-1.5 leading-tight"
              rows={3}
              defaultValue={item.custom_description || item.specs || item.name}
              onChange={(e) => updateCartItemDescription(item.id, e.target.value)}
            />
          </div>
          {user && unitPrice < (cost / exchangeRate) && (
            <div className="text-red-500 text-[10px] mt-0.5">
              ⚠️ 低于成本价
            </div>
          )}
        </div>
        
        {/* Right: Controls Compact Grid */}
        <div className="flex flex-col gap-1 shrink-0 items-end flex-1 max-w-[140px]">
          {/* Row 1: Cost & Price */}
          <div className="flex items-center gap-2 justify-end w-full">
            {/* Cost / Code / Details (Small & Gray) */}
            <div className="text-[10px] text-gray-400 flex flex-col items-end leading-none">
              <span className="bg-gray-100 px-1 rounded text-gray-600 font-mono" title="Product Code">
                {item.id}
              </span>
              {user && <span>¥{cost}</span>}
              {item.details && (
              <div className="relative">
                <button 
                  onClick={() => navigate(`/details/${item.id}`)}
                  className="text-[9px] text-gray-300 hover:text-blue-500 underline"
                  onMouseEnter={() => setHoveredProduct(item)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  Details
                </button>
                
                {/* Hover Popup */}
                {hoveredProduct?.id === item.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 pointer-events-none">
                    <div className="text-xs text-black whitespace-pre-wrap max-h-48 overflow-y-auto">
                       <ReactMarkdown 
                          components={{
                            img: ({node, ...props}) => <img {...props} className="w-full h-auto rounded my-1" />,
                            p: ({node, ...props}) => <p {...props} className="mb-1" />
                          }}
                        >
                          {item.details}
                        </ReactMarkdown>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Unit Price Input */}
            <div className="flex items-center border border-black h-7 w-20 bg-white">
              <span className="pl-1 text-xs font-bold text-black">{currencySymbol}</span>
              <input
                type="number"
                className={`w-full text-sm font-bold focus:outline-none text-center ${unitPrice < (cost / exchangeRate) ? 'text-red-600' : 'text-black'}`}
                value={unitPrice}
                onChange={(e) => updateCartItemPrice(item.id, Number(e.target.value))}
              />
            </div>
          </div>

          {/* Row 2: Qty */}
          <div className="flex items-center justify-end w-full">
             <div className="flex items-center border border-gray-300 h-7">
                <input
                  type="number"
                  className="w-8 text-center text-sm focus:outline-none"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) useStore.getState().setQuantity(item.id, val);
                  }}
                />
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="bg-blue-500 hover:bg-blue-600 w-7 h-full flex items-center justify-center text-white"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                </button>
             </div>
          </div>
          
          {/* Row 3: Subtotal */}
          <div className="w-full text-right">
             <div className="text-sm font-bold text-black">{currencySymbol}{subtotal}</div>
          </div>
        </div>

        {/* Action Column: Drag Handle & Remove */}
        <div className="absolute top-0 bottom-0 right-0 w-10 flex flex-col items-center justify-center gap-4 bg-gray-50 border-l border-gray-100">
           {/* Remove Button */}
           <button
            onClick={() => removeFromCart(item.id)}
            className="text-gray-300 hover:text-red-500 transition-colors p-1"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {/* Drag Handle */}
          <div {...listeners} {...attributes} className="cursor-grab text-gray-300 hover:text-gray-500 p-1 touch-none">
             <GripVertical className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};

const QuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, reorderCart, margin, exchangeRate, currency, setMargin, setExchangeRate, setCurrency, isQuoteStarted, setQuoteStarted, clearCart, addCustomItem } = useStore();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = cart.findIndex((item) => item.id === active.id);
      const newIndex = cart.findIndex((item) => item.id === over?.id);
      reorderCart(arrayMove(cart, oldIndex, newIndex));
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // 1. Add Logo (Image)
    // Using a base64 placeholder or fetching from public URL
    // For best results, use a high-quality PNG logo with transparent background
    const logoUrl = 'https://qhloifimrtpkjsqhfytf.supabase.co/storage/v1/object/public/DTH/Hammer/Sinodrills%20Logo.png'; 
    
    try {
      const img = new Image();
      img.src = logoUrl;
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Calculate aspect ratio to fit within a box (e.g., 40x20)
      const maxWidth = 50;
      const maxHeight = 25;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;

      doc.addImage(img, 'PNG', 14, 10, width, height);
      
      // Adjust Title Position based on Logo
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      // doc.text('Sinoquo', 14, 20); // Removed text logo in favor of image
      
      doc.setFontSize(16);
      doc.text('Quotation', 14, 45); // Moved down
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${today}`, 14, 53);
      // doc.text(`Prepared by: Sinoquo Sales Team`, 14, 59); // Removed per user request

      // Start table lower
      var startY = 65;
    } catch (e) {
      // Fallback if logo fails
      console.error('Logo load failed', e);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SINODRILLS', 14, 20);
      
      doc.setFontSize(16);
      doc.text('Quotation', 14, 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${today}`, 14, 38);
      // doc.text(`Prepared by: Sinoquo Sales Team`, 14, 44);

      var startY = 50;
    }

    // 3. Prepare Table Data
    const tableBody = cart.map((item, index) => {
      const cost = item.costItem?.cost_price || item.cost_cny || 0;
      const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
          ? item.guide_price_usd 
          : Number(((cost * margin) / exchangeRate).toFixed(2));
      const unitPrice = item.custom_price ?? calculatedPrice;
      const subtotal = unitPrice * item.quantity;
      
      return [
        index + 1,
        item.custom_description || item.specs || item.name,
        item.quantity,
        unitPrice,
        subtotal
      ];
    });

    // Calculate total amount
    const totalAmount = cart.reduce((sum, item) => {
      const cost = item.costItem?.cost_price || item.cost_cny || 0;
      const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
          ? item.guide_price_usd 
          : Number(((cost * margin) / exchangeRate).toFixed(2));
      const unitPrice = item.custom_price ?? calculatedPrice;
      return sum + (unitPrice * item.quantity);
    }, 0);
    
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Log Action
    databaseService.logQuotationAction('EXPORT_PDF', cart, totalAmount, totalQuantity);

    // 4. Add Table
    autoTable(doc, {
      startY: startY || 50,
      head: [['No.', 'Items & Descriptions', 'Quantity (pc)', `Unit price (${currency}/pc)`, `Sub amount (${currency})`]],
      body: [
        ...tableBody,
        [{ content: 'Total:', colSpan: 2, styles: { fontStyle: 'bold' } }, totalQuantity, '', totalAmount]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        lineWidth: 0.1, 
        lineColor: [0, 0, 0],
        font: 'helvetica', // Unified font
        fontStyle: 'bold',
        halign: 'center' // Center header text
      },
      bodyStyles: { 
        textColor: [0, 0, 0], 
        lineWidth: 0.1, 
        lineColor: [0, 0, 0],
        font: 'helvetica', // Unified font
        halign: 'center' // Center body text
      },
      columnStyles: {
        1: { halign: 'left' } // Left align "Items & Descriptions" column (index 1)
      },
      footStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        lineWidth: 0.1, 
        lineColor: [0, 0, 0], 
        font: 'helvetica', // Unified font
        fontStyle: 'bold',
        halign: 'center' // Center footer text
      },
    });

    // 5. Footer Note & Company Info (Dynamic Position)
    const finalY = (doc as any).lastAutoTable.finalY || 50;
    
    // Add some spacing after the table
    const footerStartY = finalY + 15;

    // Footer Note
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      'Kind reminder: Quoted prices for TC bits are valid for 7 days from quotation date due to rising tungsten costs.',
      105, // Center X position
      footerStartY,
      { align: 'center' }
    );

    // Company Info (Below the note)
    doc.setFontSize(10);
    doc.setTextColor(0); // Black
    doc.setFont('helvetica', 'normal');
    
    // Calculate Y positions relative to table end
    const companyInfoY = footerStartY + 15;
    
    doc.text('Guizhou Sinodrills Equipment Co., LTD', 14, companyInfoY);
    doc.text('Your trusted partner in rock drilling tools', 14, companyInfoY + 5);
    doc.text('www.sinodrills.com', 14, companyInfoY + 10);

    const todayFormatted = new Date().toISOString().split('T')[0].replace(/-/g, '');
    doc.save(`Sinodrills Quotation ${todayFormatted}.pdf`);
  };

  // Export to Excel
  const exportToExcel = async () => {
    // Prepare Data
    const symbol = currency === 'EUR' ? '€' : currency === 'AUD' ? 'A$' : currency === 'CNY' ? '¥' : '$';
    const headerQty = 'Qty';
    const headerUnit = `${symbol}/p`;
    const headerSub = `Sub amount (${symbol})`;
    const data = cart.map((item, index) => {
      const cost = item.costItem?.cost_price || item.cost_cny || 0;
      const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
          ? item.guide_price_usd 
          : Number(((cost * margin) / exchangeRate).toFixed(2));
      const unitPrice = item.custom_price ?? calculatedPrice;
      const subtotal = unitPrice * item.quantity;

      return {
        'No.': index + 1,
        'Items & Descriptions': item.custom_description || item.specs || item.name,
        [headerQty]: item.quantity,
        [headerUnit]: unitPrice,
        [headerSub]: subtotal
      };
    });

    // Add Total Row

    const totalAmount = cart.reduce((sum, item) => {
      const cost = item.costItem?.cost_price || item.cost_cny || 0;
      const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
          ? item.guide_price_usd 
          : Number(((cost * margin) / exchangeRate).toFixed(2));
      const unitPrice = item.custom_price ?? calculatedPrice;
      return sum + (unitPrice * item.quantity);
    }, 0);
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Log Action
    databaseService.logQuotationAction('EXPORT_EXCEL', cart, totalAmount, totalQuantity);

    data.push({
      'No.': 'Total:',
      'Items & Descriptions': '',
      [headerQty]: totalQuantity,
      [headerUnit]: 0, // Placeholder
      [headerSub]: totalAmount
    } as any);

    // Try styled export if xlsx-js-style is available; fallback to plain xlsx
    let XLSXLib: any = XLSX;
    try {
      const dynImport = new Function('s', 'return import(s)');
      const mod: any = await (dynImport as any)('xlsx-js-style');
      XLSXLib = (mod && (mod.default ?? mod)) || XLSXLib;
    } catch {}

    const worksheet = XLSXLib.utils.json_to_sheet(data);

    // Apply styles when style-capable lib is present
    if (XLSXLib && XLSXLib.utils && XLSXLib.utils.decode_range && worksheet['!ref']) {
      try {
        const range = XLSXLib.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.row; R <= range.e.row; ++R) {
          for (let C = range.s.col; C <= range.e.col; ++C) {
            const addr = XLSXLib.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[addr];
            if (!cell) continue;
            cell.s = cell.s || {};
            cell.s.font = { ...(cell.s.font || {}), name: 'DengXian' };
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          }
        }
        // Bold header row
        for (let C = range.s.col; C <= range.e.col; ++C) {
          const addr = XLSXLib.utils.encode_cell({ r: range.s.row, c: C });
          const cell = worksheet[addr];
          if (!cell) continue;
          cell.s = cell.s || {};
          cell.s.font = { ...(cell.s.font || {}), name: 'DengXian', bold: true };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        }
      } catch {}
    }

    const workbook = XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(workbook, worksheet, 'Quotation');
    
    // Generate buffer
    const excelBuffer = XLSXLib.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    
    const todayFormatted = new Date().toISOString().split('T')[0].replace(/-/g, '');
    saveAs(dataBlob, `Sinodrills Quotation ${todayFormatted}.xlsx`);
  };

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  const loadCustomers = async () => {
    const list = await databaseService.getCustomers();
    setCustomers(list || []);
  };

  const handleSaveQuote = async () => {
    if (!user) {
      alert('Please login first.');
      return;
    }
    const res = await databaseService.saveQuoteHistory({
      userId: user.id,
      customerId: selectedCustomerId || undefined,
      customerNew: !selectedCustomerId && newCustomerName ? { name: newCustomerName, contact: newCustomerContact } : undefined,
      cart,
      margin,
      exchangeRate,
      currency,
    });
    if ((res as any).success) {
      setShowSaveModal(false);
      alert('Saved quote history.');
    } else {
      alert('Save failed. Please run DB migrations for quote tables.');
    }
  };

  // If cart is empty, redirect or show message
  if (cart.length === 0) {
    return (
      <div className="p-6 text-center">
        <p>No items in quotation.</p>
        <button onClick={() => navigate('/')} className="text-primary mt-4">Go to Search</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20 p-6">
      
      {/* Quotation Global Settings */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
          <span>Quotation Settings</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-gray-500 text-[10px] mb-1 uppercase tracking-wider">Margin</label>
            <input 
              type="number" 
              step="0.1" 
              value={margin} 
              onChange={(e) => setMargin(Number(e.target.value))} 
              className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-blue-500 focus:border-blue-500" 
              title="Multiplier applied to cost price (e.g. 1.2)"
            />
          </div>
          <div>
            <label className="block text-gray-500 text-[10px] mb-1 uppercase tracking-wider">Currency</label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)} 
              className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CNY">CNY (¥)</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-500 text-[10px] mb-1 uppercase tracking-wider">Ex. Rate</label>
            <input 
              type="number" 
              step="0.01" 
              value={exchangeRate} 
              onChange={(e) => setExchangeRate(Number(e.target.value))} 
              className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-blue-500 focus:border-blue-500" 
              title="Exchange rate from CNY to selected currency"
            />
          </div>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={cart.map(i => i.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0">
            {cart.map((item, index) => (
              <SortableItem 
                key={item.id} 
                item={item} 
                index={index}
                navigate={navigate}
                hoveredProduct={hoveredProduct}
                setHoveredProduct={setHoveredProduct}
                user={user}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Action Buttons: Clear & Add Custom */}
      <div className="flex justify-between items-center mt-2">
        <button
          onClick={() => setShowClearConfirm(true)}
          className="text-red-500 border border-red-500 hover:bg-red-50 px-3 py-1 rounded text-xs font-medium transition-colors"
        >
          Clear
        </button>

        <button
          onClick={addCustomItem}
          className="flex items-center gap-1 text-blue-600 border border-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Custom Row
        </button>
      </div>

      {/* Continue Button (Bottom Right) */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-4 bg-white/80 backdrop-blur-sm p-4 border-t border-gray-200 shadow-lg z-10">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded shadow-md active:bg-gray-200 border border-gray-300 min-w-[140px]"
        >
          Add Product
        </button>
        <button 
          onClick={() => {
            setShowPreviewModal(true);
            setQuoteStarted(true);
          }}
          className="bg-green-500 text-black font-bold px-6 py-3 rounded shadow-md active:bg-green-600 min-w-[140px]"
        >
          Quote Preview
        </button>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed footer */}
      <div className="h-24"></div>

      {/* Floating Panel (Panel 5) */}
      {!showPreviewModal && isQuoteStarted && <CartFloatingPanel />}

      {/* Quotation Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-white p-6 shadow-2xl max-w-2xl w-full relative overflow-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Table Structure */}
            <div className="mt-4 border border-black text-black text-sm font-sans">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th rowSpan={2} className="border-r border-black p-2 w-12 text-center align-middle">No.</th>
                    <th className="border-r border-black p-2 text-center font-bold">Items & Descriptions</th>
                    <th className="border-r border-black p-2 w-24 text-center">Quantity</th>
                    <th className="border-r border-black p-2 w-24 text-center">Unit price</th>
                    <th className="p-2 w-24 text-center">Sub amount</th>
                  </tr>
                  <tr className="border-b border-black">
                    {/* Items & Descriptions Sub-header */}
                    <th className="border-r border-black p-2 text-center font-normal">Rock drilling tools</th>
                    <th className="border-r border-black p-2 text-center font-normal">(pc)</th>
                    <th className="border-r border-black p-2 text-center font-normal">({currency}/pc)</th>
                    <th className="p-2 text-center font-normal">({currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => {
                     const cost = item.costItem?.cost_price || item.cost_cny || 0;
                     const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
                         ? item.guide_price_usd 
                         : Number(((cost * margin) / exchangeRate).toFixed(2));
                     const unitPrice = item.custom_price ?? calculatedPrice;
                     const subtotal = unitPrice * item.quantity;

                     return (
                      <tr key={item.id} className="border-b border-black">
                        <td className="border-r border-black p-2 text-center">{index + 1}</td>
                        <td className="border-r border-black p-2 text-left whitespace-pre-wrap">
                          {item.custom_description || item.specs || item.name}
                        </td>
                        <td className="border-r border-black p-2 text-center">{item.quantity}</td>
                        <td className="border-r border-black p-2 text-center">{unitPrice}</td>
                        <td className="p-2 text-center">{subtotal}</td>
                      </tr>
                     );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="border-r border-black p-2 text-left font-bold" colSpan={2}>Total:</td>
                    <td className="border-r border-black p-2 text-center">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="border-r border-black p-2"></td>
                    <td className="p-2 text-center">
                      {cart.reduce((sum, item) => {
                         const cost = item.costItem?.cost_price || item.cost_cny || 0;
                         const calculatedPrice = (currency === 'USD' && item.guide_price_usd) 
                             ? item.guide_price_usd 
                             : Number(((cost * margin) / exchangeRate).toFixed(2));
                         const unitPrice = item.custom_price ?? calculatedPrice;
                         return sum + (unitPrice * item.quantity);
                      }, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 text-center text-gray-500 text-xs print:hidden">
              Kind reminder: Quoted prices for TC bits are valid for 7 days from quotation date due to rising tungsten costs.
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={() => { setShowSaveModal(true); loadCustomers(); }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
              >
                Save Quote History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Clear Quotation?</h3>
            <p className="text-gray-600 mb-6">Are you sure you wanna clear the entire quotation list?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
              >
                No, Keep it
              </button>
              <button 
                onClick={() => {
                  clearCart();
                  setShowClearConfirm(false);
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal - Removed as we now navigate to separate page */}
      {/* detailsProduct && (...) */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white p-4 rounded shadow max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-bold mb-3">Save Quote History</div>
            <div className="space-y-2">
              <div className="text-xs text-gray-600">To whom</div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded text-sm bg-white"
              >
                <option value="">Add new customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {!selectedCustomerId && (
                <>
                  <input
                    placeholder="Customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded text-sm"
                  />
                  <input
                    placeholder="Contact info"
                    value={newCustomerContact}
                    onChange={(e) => setNewCustomerContact(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded text-sm"
                  />
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowSaveModal(false)} className="px-3 py-1 text-xs border rounded">Cancel</button>
              <button onClick={handleSaveQuote} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationPage;
