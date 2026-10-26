import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  CheckCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Check,
} from 'lucide-react';
import type { Book, Supplier, User } from '../../types/index.ts';
import {
  getSuppliers,
  addSupplier,
  recordPurchase,
  getPurchases,
  receivePendingPurchase,
  recordSupplierPayment,
} from '../../db/database.ts';
import { formatKES, formatDateTime } from '../../utils/formatters.ts';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Modal } from '../common/Modal.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { EmptyState } from '../common/EmptyState.tsx';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'unpaid' | 'received'>('all');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<number | null>(null);

  // Modals
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [receivingPurchase, setReceivingPurchase] = useState<any | null>(null);
  const [payingPurchase, setPayingPurchase] = useState<any | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [supps, purchs] = await Promise.all([getSuppliers(), getPurchases()]);
      setSuppliers(supps);
      setPurchases(purchs);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load purchases data');
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

    try {
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    }
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
    const paymentStatus = paidNum >= totalPurchaseCost ? 'paid' : paidNum > 0 ? 'partial' : 'unpaid';

    setIsSubmitting(true);
    try {
      await recordPurchase(
        {
          supplierId: Number(selectedSupplierId),
          invoiceNumber: invoiceNumber.trim(),
          totalCost: totalPurchaseCost,
          amountPaid: paidNum,
          paymentStatus,
          status: purchaseStatus,
          notes: undefined,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!receivingPurchase) return;
    try {
      await receivePendingPurchase(
        receivingPurchase.id,
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      toast.success(`Received Invoice #${receivingPurchase.invoice_number}. Inventory updated!`);
      setReceivingPurchase(null);
      await loadData();
      await onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive goods');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPurchase) return;
    const amount = parseFloat(paymentAmountInput);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      await recordSupplierPayment(
        payingPurchase.id,
        amount,
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      toast.success(`Payment of ${formatKES(amount)} recorded for #${payingPurchase.invoice_number}`);
      setPayingPurchase(null);
      setPaymentAmountInput('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record supplier payment');
    }
  };

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSearch =
        p.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'pending') return p.status === 'pending';
      if (statusFilter === 'unpaid') return p.payment_status === 'unpaid' || p.payment_status === 'partial';
      if (statusFilter === 'received') return p.status === 'received';
      return true;
    });
  }, [purchases, searchQuery, statusFilter]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex rounded-lg bg-neutral-100 p-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`min-h-[40px] px-4 py-2 rounded-md transition-all ${
                activeTab === 'purchases'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Deliveries & Orders ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`min-h-[40px] px-4 py-2 rounded-md transition-all ${
                activeTab === 'suppliers'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'purchases' ? 'Search invoice or supplier...' : 'Search supplier name/phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'suppliers' ? (
            <Button
              variant="primary"
              onClick={() => setIsAddSupplierOpen(true)}
              className="min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Register Supplier</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setIsNewPurchaseOpen(true)}
              className="min-h-[44px]"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Record Delivery / Purchase</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tab 1: Purchases List */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-neutral-500 font-medium whitespace-nowrap">Filter:</span>
            {[
              { id: 'all', label: 'All Invoices' },
              { id: 'pending', label: 'Pending Delivery (Stock Not Received)' },
              { id: 'unpaid', label: 'Unpaid / Balance Due' },
              { id: 'received', label: 'Stock Received' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap font-medium ${
                  statusFilter === chip.id
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-center">Delivery Status</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12">
                        <EmptyState
                          icon={<PackageCheck className="w-6 h-6" />}
                          title="No purchases found"
                          description={
                            searchQuery
                              ? 'No purchase invoices match your filter criteria.'
                              : 'Record purchase invoices to stock up your books catalog from local publishers.'
                          }
                          actionLabel={searchQuery ? undefined : 'Record First Delivery'}
                          onAction={searchQuery ? undefined : () => setIsNewPurchaseOpen(true)}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => {
                      const isExpanded = expandedPurchaseId === p.id;
                      const balanceDue = Math.max(0, p.total_cost - p.amount_paid);

                      return (
                        <React.Fragment key={p.id}>
                          <tr className="hover:bg-neutral-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                              <button
                                onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                                className="inline-flex items-center gap-1.5 hover:underline focus:outline-none"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                <span>{p.invoice_number}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-neutral-900 font-medium">
                              {p.supplier_name}
                            </td>
                            <td className="py-3 px-4 text-neutral-500 tabular-nums">
                              {formatDateTime(p.created_at)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                              {formatKES(p.total_cost)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              <span className={balanceDue > 0 ? 'text-amber-700 font-semibold' : 'text-neutral-700'}>
                                {formatKES(p.amount_paid)}
                              </span>
                              {balanceDue > 0 && (
                                <div className="text-xs text-rose-600 font-mono">
                                  Due: {formatKES(balanceDue)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {p.status === 'received' ? (
                                <StatusBadge status="success" label="Received" />
                              ) : (
                                <StatusBadge status="warning" label="Pending Delivery" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {p.payment_status === 'paid' ? (
                                <StatusBadge status="success" label="Fully Paid" />
                              ) : p.payment_status === 'partial' ? (
                                <StatusBadge status="warning" label="Partial Payment" />
                              ) : (
                                <StatusBadge status="danger" label="Unpaid" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {p.status === 'pending' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setReceivingPurchase(p)}
                                    className="min-h-[36px] bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                    title="Receive stock into inventory"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Receive</span>
                                  </Button>
                                )}
                                {p.payment_status !== 'paid' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setPayingPurchase(p);
                                      setPaymentAmountInput(String(balanceDue));
                                    }}
                                    className="min-h-[36px]"
                                    title="Record payment to supplier"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span>Pay</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded items preview */}
                          {isExpanded && p.items && p.items.length > 0 && (
                            <tr className="bg-neutral-50/80 border-b border-neutral-100">
                              <td colSpan={8} className="py-3 px-6">
                                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">
                                  Books in this invoice ({p.items.length} titles):
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {p.items.map((item: any) => (
                                    <div
                                      key={item.id}
                                      className="p-2.5 rounded-lg bg-white border border-neutral-200 text-xs flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="font-semibold text-neutral-900">{item.book_title}</div>
                                        <div className="text-neutral-500">Qty: {item.quantity} × {formatKES(item.unit_cost)}</div>
                                      </div>
                                      <div className="font-mono font-bold text-neutral-900">
                                        {formatKES(item.total_cost)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={<Building className="w-6 h-6" />}
            title="No suppliers found"
            description={
              searchQuery
                ? 'No supplier matched your search query.'
                : 'Register book publishers, distributors, and wholesalers to start recording purchase invoices.'
            }
            actionLabel={searchQuery ? undefined : 'Register First Supplier'}
            onAction={searchQuery ? undefined : () => setIsAddSupplierOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((s) => (
              <div
                key={s.id}
                className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-900 text-base">{s.name}</h4>
                    {s.contact_person && (
                      <p className="text-sm text-neutral-500">Contact: {s.contact_person}</p>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-neutral-700 pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="font-mono">{s.phone}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Owed Balance:</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      s.balance > 0 ? 'text-rose-600' : 'text-neutral-900'
                    }`}
                  >
                    {formatKES(s.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Record Purchase Modal */}
      <Modal
        isOpen={isNewPurchaseOpen}
        onClose={() => setIsNewPurchaseOpen(false)}
        title="Record Purchase / Goods Received Note"
        maxWidth="3xl"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4">
          {purchaseError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{purchaseError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Select Supplier *
              </label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
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
              <Input
                label="Invoice / Delivery Note # *"
                required
                placeholder="e.g. LHP-INV-9920"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Add Books to Purchase */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Add Books to Invoice:
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddPurchaseItem(Number(e.target.value));
                  e.target.value = '';
                }
              }}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
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
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                <tr>
                  <th className="p-3">Book Title</th>
                  <th className="p-3 w-28 text-center">Qty</th>
                  <th className="p-3 w-36 text-right">Cost Price (KES)</th>
                  <th className="p-3 text-right w-36">Total</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      Select books from the dropdown above to add them to this invoice.
                    </td>
                  </tr>
                ) : (
                  purchaseItems.map((item) => (
                    <tr key={item.bookId}>
                      <td className="p-3 font-medium text-neutral-900">{item.bookTitle}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.bookId, 'quantity', parseInt(e.target.value, 10) || 1)
                          }
                          className="w-20 min-h-[38px] px-2 py-1 text-sm border border-neutral-200 rounded text-center font-mono focus:border-neutral-900"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.unitCost}
                          onChange={(e) =>
                            handleUpdateItem(item.bookId, 'unitCost', parseFloat(e.target.value) || 0)
                          }
                          className="w-28 min-h-[38px] px-2 py-1 text-sm border border-neutral-200 rounded text-right font-mono focus:border-neutral-900"
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatKES(item.quantity * item.unitCost)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePurchaseItem(item.bookId)}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center text-neutral-400 hover:text-rose-600 rounded-md"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total & Payment Details */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-neutral-900">
              <span>TOTAL INVOICE COST:</span>
              <span className="font-mono text-lg tabular-nums">{formatKES(totalPurchaseCost)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-200">
              <div>
                <Input
                  label="Amount Paid Now (KES)"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Goods Received Status
                </label>
                <select
                  value={purchaseStatus}
                  onChange={(e) => setPurchaseStatus(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white font-medium"
                >
                  <option value="received">Received (Increments Stock Now)</option>
                  <option value="pending">Pending Delivery (Draft - No Stock Update Yet)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setIsNewPurchaseOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isSubmitting}
            >
              Save & Process Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title="Register Book Publisher / Supplier"
        maxWidth="md"
      >
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <Input
            label="Supplier / Publisher Name *"
            required
            placeholder="e.g. Longhorn Publishers PLC"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Person"
              placeholder="e.g. Sales Rep"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Phone Number *"
              required
              placeholder="e.g. 0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="orders@publisher.co.ke"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Warehouse / Office Address"
            placeholder="e.g. Funzi Road, Industrial Area, Nairobi"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setIsAddSupplierOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
            >
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Receive Goods Dialog */}
      <ConfirmDialog
        isOpen={!!receivingPurchase}
        title="Receive Goods into Inventory"
        message={`Are you sure you want to mark Invoice #${receivingPurchase?.invoice_number} as Received? All book quantities will be added to your current stock immediately.`}
        confirmLabel="Receive Stock Now"
        variant="primary"
        onConfirm={handleConfirmReceive}
        onClose={() => setReceivingPurchase(null)}
      />

      {/* Supplier Payment Modal */}
      <Modal
        isOpen={!!payingPurchase}
        onClose={() => setPayingPurchase(null)}
        title={`Record Payment to ${payingPurchase?.supplier_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">Invoice Number:</span>
              <span className="font-mono font-bold text-neutral-900">{payingPurchase?.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Cost:</span>
              <span className="font-mono font-bold text-neutral-900">{formatKES(payingPurchase?.total_cost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Already Paid:</span>
              <span className="font-mono text-neutral-700">{formatKES(payingPurchase?.amount_paid || 0)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200 font-bold">
              <span className="text-neutral-700">Remaining Balance:</span>
              <span className="font-mono text-rose-600">
                {formatKES(Math.max(0, (payingPurchase?.total_cost || 0) - (payingPurchase?.amount_paid || 0)))}
              </span>
            </div>
          </div>

          <Input
            label="Payment Amount (KES) *"
            type="number"
            step="any"
            required
            autoFocus
            value={paymentAmountInput}
            onChange={(e) => setPaymentAmountInput(e.target.value)}
            placeholder="0.00"
          />

          <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setPayingPurchase(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
