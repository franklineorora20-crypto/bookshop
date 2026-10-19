import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  PackageCheck,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
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
  const [purchaseNotes, setPurchaseNotes] = useState('');
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
    if (purchaseItems.some((item) => item.bookId === book.id)) return;

    setPurchaseItems((prev) => [
      ...prev,
      {
        bookId: book.id,
        bookTitle: book.title,
        quantity: 10,
        unitCost: book.purchase_price,
      },
    ]);
  };

  const handleRemovePurchaseItem = (bookId: number) => {
    setPurchaseItems((prev) => prev.filter((i) => i.bookId !== bookId));
  };

  const handleUpdateItem = (bookId: number, field: 'quantity' | 'unitCost', val: number) => {
    setPurchaseItems((prev) =>
      prev.map((item) => (item.bookId === bookId ? { ...item, [field]: val } : item))
    );
  };

  const totalPurchaseCost = purchaseItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
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
      setPurchaseError('Please provide supplier invoice / delivery note number.');
      return;
    }
    if (purchaseItems.length === 0) {
      setPurchaseError('Add at least one book to the purchase order.');
      return;
    }

    const paidVal = parseFloat(amountPaid) || 0;
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (paidVal === 0) paymentStatus = 'unpaid';
    else if (paidVal < totalPurchaseCost) paymentStatus = 'partial';

    try {
      await recordPurchase(
        {
          supplierId: Number(selectedSupplierId),
          invoiceNumber: invoiceNumber.trim(),
          totalCost: totalPurchaseCost,
          amountPaid: paidVal,
          paymentStatus,
          status: purchaseStatus,
          notes: purchaseNotes.trim(),
        },
        purchaseItems.map((i) => ({
          bookId: i.bookId,
          bookTitle: i.bookTitle,
          quantity: i.quantity,
          unitCost: i.unitCost,
          totalCost: i.quantity * i.unitCost,
        })),
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );

      setIsNewPurchaseOpen(false);
      setPurchaseItems([]);
      setInvoiceNumber('');
      setAmountPaid('');
      setPurchaseNotes('');
      await loadData();
      await onRefreshData();
    } catch (err: any) {
      setPurchaseError(err.message || 'Failed to record purchase.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Tab Switcher & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex rounded-xl bg-slate-200 p-1 border border-slate-300 w-fit">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'purchases'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Goods Received & Invoices ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registered Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'suppliers' ? (
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Supplier</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewPurchaseOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Record Delivery / Purchase</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Purchases List */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No purchase orders recorded yet. Click "Record Delivery / Purchase" to log stock received from publishers.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold">
                        {p.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(p.created_at)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatKES(p.total_cost)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700">
                        {formatKES(p.amount_paid)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            p.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.payment_status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                  {s.contact_person && (
                    <p className="text-xs text-slate-500 font-medium">Contact: {s.contact_person}</p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.phone}</span>
                </div>
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Owed Balance:</span>
                <span className={`font-bold ${s.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatKES(s.balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Purchase Modal */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Purchase Invoice / Goods Received Note</h3>
              <button onClick={() => setIsNewPurchaseOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-5 overflow-y-auto flex-1 space-y-4">
              {purchaseError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{purchaseError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice / Delivery Note # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LHP-INV-9920"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Add Books to Purchase */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add Books to Purchase:
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPurchaseItem(Number(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">+ Select book from catalog to add...</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Current Stock: {b.quantity}, Cost: KES {b.purchase_price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Book Title</th>
                      <th className="p-2.5 w-24">Qty Received</th>
                      <th className="p-2.5 w-28">Cost Price (KES)</th>
                      <th className="p-2.5 text-right w-28">Total</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {purchaseItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Select books above to add them to this invoice.
                        </td>
                      </tr>
                    ) : (
                      purchaseItems.map((item) => (
                        <tr key={item.bookId}>
                          <td className="p-2.5 font-bold text-slate-900">{item.bookTitle}</td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.bookId, 'quantity', parseInt(e.target.value, 10) || 1)
                              }
                              className="w-full px-2 py-1 text-xs border rounded text-center font-bold"
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
                              className="w-full px-2 py-1 text-xs border rounded text-right font-bold"
                            />
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            {formatKES(item.quantity * item.unitCost)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePurchaseItem(item.bookId)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total & Payment Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>TOTAL INVOICE COST:</span>
                  <span className="text-emerald-700">{formatKES(totalPurchaseCost)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount Paid Now (KES)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Goods Received Status
                    </label>
                    <select
                      value={purchaseStatus}
                      onChange={(e) => setPurchaseStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="received">Received (Increments Stock Now)</option>
                      <option value="pending">Pending Delivery (No Stock Update Yet)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Save & Update Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Register Book Publisher / Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Publisher Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Longhorn Publishers PLC"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Rep"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+254 7..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="orders@publisher.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Warehouse Address</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area, Nairobi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
