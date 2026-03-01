import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, User, ArrowLeft, LogOut, Upload, Loader } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CartFloatingPanel } from '../components/CartFloatingPanel';
import Papa from 'papaparse';

interface OrderHistoryItem {
  id: string;
  'Product Line': string;
  'Descriptions': string;
  'Qty': number;
  'Price': number;
  'Currency': string;
  'Sub Amount': number;
  'PO': string;
  'PI': string;
  'Contract': string;
  'Full_Reference_ID': string;
  created_at: string;
}

const MyZonePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyItems, setHistoryItems] = useState<OrderHistoryItem[]>([]);
  const { addToCart, allProducts, initializeProducts } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        fetchClients();
        if (allProducts.length === 0) {
             initializeProducts();
         }
      }
      setLoading(false);
    });
  }, [navigate]); // Remove allProducts.length to avoid infinite loop if 0 products

  const fetchClients = async () => {
    // 1. Fetch unique PO prefixes (Old Logic)
    const { data: poData, error: poError } = await supabase
      .from('order_history')
      .select('PO')
      .order('PO');

    // 2. Fetch unique source_file names (New Logic for CSV Imports)
    const { data: fileData, error: fileError } = await supabase
        .from('order_history')
        .select('source_file')
        .not('source_file', 'is', null);
    
    if (poError) console.error('Error fetching clients from PO:', poError);
    if (fileError) console.error('Error fetching clients from source_file:', fileError);

    // Extract clients from POs (e.g. "dean001" -> "dean")
    const poClients = poData?.map(item => {
        const match = item.PO?.match(/^([a-zA-Z]+)/);
        return match ? match[1] : null;
    }).filter(Boolean) || [];

    // Extract clients from Filenames (e.g. "piltec.csv" -> "Piltec")
    const fileClients = fileData?.map(item => {
        if (!item.source_file) return null;
        const name = item.source_file.replace(/\.csv$/i, ''); // Remove extension
        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1);
    }).filter(Boolean) || [];

    // Merge and deduplicate
    const uniqueClients = Array.from(new Set([...poClients, ...fileClients])).sort();
    setClients(uniqueClients as string[]);
  };

  const fetchOrderHistory = async (clientName: string, query: string) => {
    // Determine filter type based on client name convention
    // If capitalized (e.g. "Piltec"), it's likely from a file upload -> match source_file
    // If lowercase (e.g. "dean"), it's likely from PO prefix -> match PO
    
    // However, to be robust, we should try to match EITHER.
    // The previous OR query had a syntax error in construction.
    
    let queryBuilder = supabase.from('order_history').select('*');

    if (clientName) {
        // Construct OR filter: PO starts with clientName OR source_file matches clientName.csv
        // Supabase PostgREST syntax for OR is: or=(col1.eq.val1,col2.eq.val2)
        // We want ILIKE for case insensitivity.
        
        // Note: clientName might be "Piltec" or "dean"
        const poFilter = `PO.ilike.${clientName}%`;
        const fileFilter = `source_file.ilike.${clientName}.csv`;
        
        // queryBuilder = queryBuilder.or(`${poFilter},${fileFilter}`);
        // But wait, if we mix ORs, we need to be careful with the search query OR.
        
        // To simplify, let's just fetch everything for the client first.
        queryBuilder = queryBuilder.or(`${poFilter},${fileFilter}`);
    }

    if (query) {
      // Search in Full_Reference_ID or Descriptions
      // This needs to be AND-ed with the client filter.
      // Supabase chaining is AND by default.
      // But queryBuilder.or(...) applies to the whole set?
      // No, .or() is just a filter condition.
      
      // Let's chain them carefully.
      // (PO match OR File match) AND (Ref match OR Desc match)
      // Supabase JS doesn't support nested parens easily in one go without raw query string sometimes.
      
      // Alternative: Filter client first, then filter text.
      // Since we already applied the Client OR, adding another .or() for search might confuse it if not grouped?
      // Actually, Supabase treats separate .or() calls as AND-ed conditions.
      // So: .or(ClientFilter).or(SearchFilter) means: (Client) AND (Search)
      
      queryBuilder = queryBuilder.or(`"Full_Reference_ID".ilike.%${query}%,"Descriptions".ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setHistoryItems(data || []);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      fetchOrderHistory(selectedClient, searchQuery);
    } else {
      setHistoryItems([]);
    }
  }, [selectedClient, searchQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAddToQuote = (item: OrderHistoryItem) => {
    // Try to find matching product in our database to get cost info
    const matchingProduct = allProducts.find(p => 
      (p.specs === item['Descriptions'] && p.name === item['Product Line']) ||
      (p.specs && item['Descriptions'] && p.specs.includes(item['Descriptions'])) // Fuzzy match fallback
    );

    // We use the History Item's ID as the Cart ID to ensure uniqueness.
    // This prevents merging different history items (with different prices/descriptions) into a single generic product.
    // We inherit cost_cny from the matching product if available to ensure margin calculations work.
    
    const productToAdd = {
      // Inherit base properties from matching product (cost, category, images) if found
      ...(matchingProduct || {}),
      
      // Override identity properties to match the History Item
      // Use a combination of ID and random string if the ID is not unique or present, to force uniqueness
      // Even if item.id exists, if it's not unique (due to bad import), we must ensure uniqueness for the cart
      id: item.id ? `${item.id}-${Date.now()}` : `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      name: item['Product Line'] || matchingProduct?.name || 'Custom Item',
      specs: item['Descriptions'] || matchingProduct?.specs || '',
      
      // Set custom fields to ensure the cart displays the specific history details
      custom_description: item['Descriptions'], // Pre-fill editable description
      custom_price: item['Price'], // Use historical price
      
      // Set quantity to 1 as per user request (default click adds 1, not historical qty)
      quantity: 1,
      
      // Metadata
      category: 'History Item',
      description: `From history: ${item['Full_Reference_ID']}`,
      
      // Ensure prices are set
      guide_price_usd: item['Price'],
      cost_cny: matchingProduct?.cost_cny || 0,
    };

    addToCart(productToAdd as any);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Prepare data for insertion
          // Filter out empty rows and map to table columns
          const rowsToInsert = results.data.map((row: any) => ({
            "Product Line": row['Product Line'],
            "Descriptions": row['Descriptions'],
            "Qty": row['Qty'] ? parseInt(row['Qty']) : 0,
            "Price": row['Price'] ? parseFloat(row['Price']) : 0,
            "Currency": row['Currency'] || 'USD',
            "Sub Amount": row['Sub Amount'] ? parseFloat(row['Sub Amount']) : 0,
            "PO": row['PO'],
            "PI": row['PI'],
            "Contract": row['Contract'],
            "Full_Reference_ID": row['Full_Reference_ID'],
            "source_file": file.name, // Important: Tag with filename for filtering
            "owner_id": user?.id // Assign to current user
          }));

          // Insert into Supabase
          const { error } = await supabase
            .from('order_history')
            .insert(rowsToInsert);

          if (error) throw error;

          // Success
          alert(`Successfully imported ${rowsToInsert.length} records from ${file.name}`);
          fetchClients(); // Refresh client list
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        } catch (err: any) {
          console.error('Upload error:', err);
          setUploadError(err.message || 'Failed to upload CSV');
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        console.error('CSV Parse error:', error);
        setUploadError('Failed to parse CSV file');
        setIsUploading(false);
      }
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">My Zone</h1>
          </div>
          <button onClick={handleLogout} className="text-xs bg-blue-700 px-2 py-1 rounded hover:bg-blue-800 flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </div>
        
        <h2 className="text-sm font-medium opacity-90 mb-2">Client Inquiry & Order History</h2>

        {/* Client Selector & Import */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={selectedClient || ''}
              onChange={(e) => {
                setSelectedClient(e.target.value);
              }}
              className="w-full bg-white text-gray-900 rounded p-2 text-sm focus:outline-none appearance-none"
            >
              <option value="">Select a Client...</option>
              {clients.map(clientName => (
                <option key={clientName} value={clientName}>{clientName}</option>
              ))}
            </select>
            {/* Custom arrow if needed, but appearance-none + default is fine for now */}
          </div>
          
          {/* Import Button */}
          <div className="relative">
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-blue-500 hover:bg-blue-400 text-white p-2 rounded flex items-center justify-center h-full aspect-square"
                title="Import History CSV"
             >
                {isUploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
             </button>
          </div>
        </div>
        {uploadError && <div className="text-red-200 text-xs mt-1">{uploadError}</div>}
      </div>

      <div className="p-4">
        {selectedClient ? (
          <>
            {/* Search within Client History */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${selectedClient}'s history...`}
                className="w-full border border-gray-300 rounded-lg py-2 pl-3 pr-10 focus:outline-none focus:border-blue-500 text-sm"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
            </div>

            {/* History List */}
            <div className="space-y-3">
              {historyItems.length > 0 ? (
                historyItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Reference ID and Status */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1 rounded">
                            {item['Full_Reference_ID']}
                          </span>
                          {item['Contract'] && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                              Contract: {item['Contract']}
                            </span>
                          )}
                          {!item['Contract'] && item['PI'] && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                              PI: {item['PI']}
                            </span>
                          )}
                        </div>

                        <div className="font-medium text-sm text-gray-900 truncate" title={item['Descriptions']}>
                          {item['Descriptions']}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {item['Product Line']}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          <span className="font-medium text-green-600">
                            {item['Currency']} {item['Price']}
                          </span>
                          <span className="text-gray-400">
                            Qty: {item['Qty']}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleAddToQuote(item)}
                        className="shrink-0 bg-blue-100 text-blue-700 p-2 rounded-full hover:bg-blue-200 transition-colors"
                        title="Add to Quote"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {searchQuery ? 'No matching records found.' : 'No history found for this client.'}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Please select a client to view their history.</p>
          </div>
        )}
      </div>

      <CartFloatingPanel />
    </div>
  );
};

export default MyZonePage;