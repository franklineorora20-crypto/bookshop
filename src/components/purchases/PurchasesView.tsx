import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Truck,
  Plus,
  PackageCheck,
  Phone,
  Mail,
  MapPin,
  Building,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';
import { Book, Supplier, User } from '../../types/index.ts';
import { getSuppliers, addSupplier, recordPurchase, getPurchases } from '../../db/database.ts';
import { formatKES, formatDateTime } from '../../utils/formatters.ts';

interface PurchasesViewProps {
  books: Book[];
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  books,
  currentUser,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);

  // Supplier Form
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Purchase Form
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<'received' | 'pending'>('received');
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ bookId: number; bookTitle: string; quantity: number; unitCost: number }>
  >([]);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const supps = await getSuppliers();
      const purchs = await getPurchases();
      setSuppliers(supps);
      setPurchases(purchs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !phone.trim()) return;

    await addSupplier(
      {
        name: supplierName.trim(),
        contact_person: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      },
      currentUser?.id || 1,
      currentUser?.full_name || 'Admin'
    );

    toast.success(`Supplier "${supplierName.trim()}" registered`);
    setSupplierName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsAddSupplierOpen(false);
    await loadData();
  };

  const handleAddPurchaseItem = (bookId: number) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const existing = purchaseItems.find((p) => p.bookId === bookId);
    if (existing) {
      setPurchaseItems(
        purchaseItems.map((p) => (p.bookId === bookId ? { ...p, quantity: p.quantity + 1 } : p))
      );
    } else {
      setPurchaseItems([
        ...purchaseItems,
        {
          bookId: book.id,
          bookTitle: book.title,
          quantity: 1,
          unitCost: book.purchase_price,
        },
      ]);
    }
  };

  const handleUpdateItem = (
    bookId: number,
    field: 'quantity' | 'unitCost',
    value: number
  ) => {
    setPurchaseItems(
      purchaseItems.map((item) => (item.bookId === bookId ? { ...item, [field]: value } : item))
    );
  };

  const handleRemovePurchaseItem = (bookId: number) => {
    setPurchaseItems(purchaseItems.filter((i) => i.bookId !== bookId));
  };

  const totalPurchaseCost = purchaseItems.reduce(
    (sum, i) => sum + i.quantity * i.unitCost,
    0
  );

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError(null);

    if (!selectedSupplierId) {
      setPurchaseError('Please select a supplier.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setPurchaseError('Invoice or Delivery Note number is required.');
      return;
    }
    if (purchaseItems.length === 0) {
      setPurchaseError('Please add at least one book to this delivery.');
      return;
    }

    const paidNum = parseFloat(amountPaid) || 0;

    try {
      await recordPurchase(
        {
          supplier_id: Number(selectedSupplierId),
          invoice_number: invoiceNumber.trim(),
          total_cost: totalPurchaseCost,
          amount_paid: paidNum,
          status: purchaseStatus,
          notes: undefined,
          user_id: currentUser?.id || 1,
          items: purchaseItems.map((i) => ({
            book_id: i.bookId,
            quantity: i.quantity,
            unit_cost: i.unitCost,
            total_cost: i.quantity * i.unitCost,
          })),
        },
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );

      toast.success(`Delivery recorded: #${invoiceNumber.trim()} • ${formatKES(totalPurchaseCost)}`);
      setIsNewPurchaseOpen(false);
      setPurchaseItems([]);
      setInvoiceNumber('');
      setSelectedSupplierId('');
      setAmountPaid('');
      await loadData();
      await onRefreshData();
    } catch (err: any) {
      setPurchaseError(err.message || 'Failed to save purchase.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Segmented Tabs & Actions Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex rounded-lg bg-neutral-100 p-1 text-xs">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all tactile-btn ${
              activeTab === 'purchases'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Goods Received & Invoices ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all tactile-btn ${
              activeTab === 'suppliers'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Registered Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'suppliers' ? (
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors tactile-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Supplier</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewPurchaseOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors tactile-btn"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Record Delivery / Purchase</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Purchases List */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Total Cost</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      No purchase orders recorded yet. Click "Record Delivery / Purchase" to log stock received from publishers.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-neutral-900">
                        {p.invoice_number}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-800 font-medium">
                        {p.supplier_name}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500 tabular-nums">{formatDateTime(p.created_at)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-900 tabular-nums">
                        {formatKES(p.total_cost)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-neutral-700 tabular-nums">
                        {formatKES(p.amount_paid)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="font-mono text-[11px] uppercase text-neutral-700">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="font-mono text-[11px] uppercase text-neutral-600">
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        suppliers.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-neutral-200/80 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-neutral-900 text-sm">No suppliers registered yet</h4>
            <p className="text-neutral-400 text-xs max-w-md">
              Register book publishers, distributors, and wholesalers to start recording purchase invoices.
            </p>
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors mt-1 tactile-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Register First Supplier
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-900 text-xs">{s.name}</h4>
                    {s.contact_person && (
                      <p className="text-[11px] text-neutral-400">Contact: {s.contact_person}</p>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-neutral-50 border border-neutral-200/70 text-neutral-500 flex items-center justify-center">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-1 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span>{s.phone}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-neutral-400" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Owed Balance:</span>
                  <span className={`font-mono font-medium tabular-nums ${s.balance > 0 ? 'text-rose-600' : 'text-neutral-800'}`}>
                    {formatKES(s.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Record Purchase Modal with spring animations */}
      <AnimatePresence>
        {isNewPurchaseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsNewPurchaseOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] text-neutral-900 z-10"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm tracking-tight text-neutral-900">
                  Record Purchase / Goods Received Note
                </h3>
                <button
                  onClick={() => setIsNewPurchaseOpen(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePurchase} className="p-5 overflow-y-auto flex-1 space-y-4">
                {purchaseError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Select Supplier *
                    </label>
                    <select
                      required
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Invoice / Delivery Note # *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LHP-INV-9920"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                {/* Add Books to Purchase */}
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Add Books to Invoice:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPurchaseItem(Number(e.target.value));
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                  >
                    <option value="">+ Select book from catalog to add...</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} (Stock: {b.quantity}, Cost: KES {b.purchase_price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items Table */}
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2.5">Book Title</th>
                        <th className="p-2.5 w-24">Qty Received</th>
                        <th className="p-2.5 w-28">Cost Price (KES)</th>
                        <th className="p-2.5 text-right w-28">Total</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {purchaseItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-neutral-400">
                            Select books above to add them to this invoice.
                          </td>
                        </tr>
                      ) : (
                        purchaseItems.map((item) => (
                          <tr key={item.bookId}>
                            <td className="p-2.5 font-medium text-neutral-900">{item.bookTitle}</td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(item.bookId, 'quantity', parseInt(e.target.value, 10) || 1)
                                }
                                className="w-full px-2 py-1 text-xs border border-neutral-200 rounded text-center font-mono"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="any"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateItem(item.bookId, 'unitCost', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 text-xs border border-neutral-200 rounded text-right font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium text-neutral-900 tabular-nums">
                              {formatKES(item.quantity * item.unitCost)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePurchaseItem(item.bookId)}
                                className="text-neutral-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total & Payment Details */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-neutral-900">
                    <span>TOTAL INVOICE COST:</span>
                    <span className="font-mono text-sm tabular-nums">{formatKES(totalPurchaseCost)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                        Amount Paid Now (KES)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                        Goods Received Status
                      </label>
                      <select
                        value={purchaseStatus}
                        onChange={(e) => setPurchaseStatus(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white font-medium"
                      >
                        <option value="received">Received (Increments Stock Now)</option>
                        <option value="pending">Pending Delivery (No Stock Update Yet)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsNewPurchaseOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs tactile-btn"
                  >
                    Save & Update Inventory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isAddSupplierOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsAddSupplierOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-md w-full overflow-hidden text-neutral-900 z-10"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm tracking-tight text-neutral-900">
                  Register Book Publisher / Supplier
                </h3>
                <button
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSupplier} className="p-5 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Supplier / Publisher Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Longhorn Publishers PLC"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Rep"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+254 7..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="orders@publisher.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Warehouse Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Area, Nairobi"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs tactile-btn"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
