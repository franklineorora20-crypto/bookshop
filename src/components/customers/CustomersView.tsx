import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  CreditCard,
  History,
  FileSpreadsheet,
  AlertCircle,
  Phone,
  Mail,
  School,
  CheckCircle2,
  Printer,
  X,
} from 'lucide-react';
import { Customer, User } from '../../types/index.ts';
import { addCustomer, updateCustomer, recordCreditPayment, getCustomerPayments } from '../../db/database.ts';
import { formatKES, formatDateTime } from '../../utils/formatters.ts';

interface CustomersViewProps {
  customers: Customer[];
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  currentUser,
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [repayCustomer, setRepayCustomer] = useState<Customer | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);

  // Add Customer Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custType, setCustType] = useState<'school' | 'teacher' | 'parent' | 'institution' | 'individual'>('school');
  const [creditLimit, setCreditLimit] = useState('50000');
  const [formError, setFormError] = useState<string | null>(null);

  // Repayment Form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'mpesa' | 'bank'>('mpesa');
  const [repayCode, setRepayCode] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [repayError, setRepayError] = useState<string | null>(null);
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
    const matchesType = filterType === 'all' || c.institution_type === filterType;
    return matchesSearch && matchesType;
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + c.current_balance, 0);
  const customersInDebt = customers.filter((c) => c.current_balance > 0).length;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!custName.trim() || !custPhone.trim()) {
      setFormError('Customer name and phone number are required.');
      return;
    }

    try {
      await addCustomer(
        {
          name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim() || undefined,
          institution_type: custType,
          credit_limit: parseFloat(creditLimit) || 0,
        },
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );

      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCreditLimit('50000');
      setIsAddCustomerOpen(false);
      await onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add customer.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayCustomer) return;
    setRepayError(null);

    const amount = parseFloat(repayAmount) || 0;
    if (amount <= 0) {
      setRepayError('Payment amount must be greater than zero.');
      return;
    }

    if (repayMethod === 'mpesa' && (!repayCode.trim() || repayCode.trim().length < 6)) {
      setRepayError('Please provide the M-Pesa transaction code.');
      return;
    }

    setIsSubmittingRepayment(true);
    try {
      await recordCreditPayment(
        {
          customerId: repayCustomer.id,
          amount,
          paymentMethod: repayMethod,
          referenceCode: repayCode.trim().toUpperCase() || undefined,
          notes: repayNotes.trim() || undefined,
        },
        currentUser?.id || 1,
        currentUser?.full_name || 'Cashier'
      );

      setRepayAmount('');
      setRepayCode('');
      setRepayNotes('');
      setRepayCustomer(null);
      await onRefreshData();
    } catch (err: any) {
      setRepayError(err.message || 'Failed to record repayment.');
    } finally {
      setIsSubmittingRepayment(false);
    }
  };

  const handleOpenStatement = async (cust: Customer) => {
    setStatementCustomer(cust);
    try {
      const pmts = await getCustomerPayments(cust.id);
      setCustomerPayments(pmts);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Credit Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Outstanding Debts
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatKES(totalOutstanding)}</p>
          <span className="text-xs text-slate-400">Total uncollected credit sales</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Debtors Count
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{customersInDebt} accounts</p>
          <span className="text-xs text-slate-400">Out of {customers.length} registered customers</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Credit Control Status
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">Enforced</p>
          <span className="text-xs text-slate-400">POS checks limits prior to checkout</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Search customer by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="all">All Types</option>
            <option value="school">Schools & Academies</option>
            <option value="teacher">Teachers</option>
            <option value="parent">Parents</option>
            <option value="institution">Institutions</option>
            <option value="individual">Individuals</option>
          </select>
        </div>

        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No customers found matching filter.
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const hasDebt = c.current_balance > 0;
            const availableCredit = Math.max(0, c.credit_limit - c.current_balance);

            return (
              <div
                key={c.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {c.institution_type || 'individual'}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                        hasDebt ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {hasDebt ? `Owes: ${formatKES(c.current_balance)}` : 'Clear Balance'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Credit Limit:</span>
                      <span className="font-bold text-slate-800">{formatKES(c.credit_limit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available to Spend:</span>
                      <span className="font-bold text-emerald-700">{formatKES(availableCredit)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenStatement(c)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Statement</span>
                  </button>
                  <button
                    disabled={!hasDebt}
                    onClick={() => {
                      setRepayCustomer(c);
                      setRepayAmount(c.current_balance.toString());
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      hasDebt
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Debt</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Debt Repayment Modal */}
      {repayCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Record Debt Repayment</h3>
                <p className="text-xs text-slate-400">{repayCustomer.name}</p>
              </div>
              <button onClick={() => setRepayCustomer(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              {repayError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{repayError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-600 font-medium">Current Debt Balance:</span>
                <span className="text-lg font-bold text-rose-600">
                  {formatKES(repayCustomer.current_balance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Amount (KES) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-300 text-emerald-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank">Bank Transfer / Cheque</option>
                </select>
              </div>

              {repayMethod === 'mpesa' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    M-Pesa Transaction Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QKH789012"
                    value={repayCode}
                    onChange={(e) => setRepayCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared term 1 textbooks"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRepayCustomer(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRepayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  {isSubmittingRepayment ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Statement Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div>
                <h3 className="font-bold text-sm">Account Statement</h3>
                <p className="text-xs text-slate-400">{statementCustomer.name}</p>
              </div>
              <button onClick={() => setStatementCustomer(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans text-xs">
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{statementCustomer.name}</h3>
                  <p className="text-slate-500">Phone: {statementCustomer.phone}</p>
                  {statementCustomer.email && <p className="text-slate-500">Email: {statementCustomer.email}</p>}
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Credit Limit: {formatKES(statementCustomer.credit_limit)}</p>
                  <p className="text-sm font-extrabold text-rose-600 mt-1">
                    Outstanding Debt: {formatKES(statementCustomer.current_balance)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Recorded Debt Repayments</h4>
                {customerPayments.length === 0 ? (
                  <p className="py-6 text-center text-slate-400">No repayment receipts recorded yet.</p>
                ) : (
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Ref Code</th>
                        <th className="p-2.5 text-right">Amount (KES)</th>
                        <th className="p-2.5">Received By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono">{formatDateTime(p.created_at)}</td>
                          <td className="p-2.5 uppercase font-semibold">{p.payment_method}</td>
                          <td className="p-2.5 font-mono text-slate-600">{p.reference_code || '—'}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">{formatKES(p.amount)}</td>
                          <td className="p-2.5 text-slate-500">{p.user_name || 'Staff'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Register New Customer / School</h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-5 space-y-3">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / School Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Mary's Girls High School"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+254 7..."
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="school">School / College</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="institution">Institution / NGO</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="accounts@school.ac.ke"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Limit (KES) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300"
                />
                <p className="text-[11px] text-slate-400 mt-1">Maximum allowed credit at POS checkout.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
