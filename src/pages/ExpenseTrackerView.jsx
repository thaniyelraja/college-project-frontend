import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ExpenseTrackerView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [settledPersons, setSettledPersons] = useState(new Set());
  
  // New Expense Form State
  const [desc, setDesc] = useState('');
  const [total, setTotal] = useState('');
  const [payer, setPayer] = useState('');
  const [splitMode, setSplitMode] = useState('Equal'); // Equal or Custom
  const [customSplits, setCustomSplits] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState(null); // for per-person expense accordion

  useEffect(() => {
    fetchTracker();
  }, [id]);

  const fetchTracker = async () => {
    try {
      const response = await axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}/tracker`);
      setTracker(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tracker', error);
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.trim() || tracker.memberNames.includes(newMember.trim())) return;
    
    const updatedMembers = [...tracker.memberNames, newMember.trim()];
    try {
      const response = await axios.put(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}/tracker/members`, updatedMembers);
      setTracker(response.data);
      setNewMember('');
    } catch (error) {
      console.error('Failed to add member', error);
    }
  };

  // Currency conversion removed. Locked strictly to INR.

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetDraft);
    if (isNaN(val) || val <= 0) return;
    try {
      const response = await axios.put(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}/tracker/budget`, val, {
        headers: { 'Content-Type': 'application/json' }
      });
      setTracker(response.data);
      setIsEditingBudget(false);
    } catch (error) {
      console.error('Failed to save budget', error);
    }
  };

  const handleRemoveMember = async (memberName) => {
    const updatedMembers = tracker.memberNames.filter(m => m !== memberName);
    try {
      const response = await axios.put(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}/tracker/members`, updatedMembers);
      setTracker(response.data);
    } catch (error) {
      console.error('Failed to remove member', error);
    }
  };

  const handleAddExpense = async () => {
    if (!desc || !total || !payer || isSubmitting) return;

    let finalSplits = {};
    const totalNum = parseFloat(total);

    if (isNaN(totalNum) || totalNum <= 0) return;

    if (splitMode === 'Equal') {
      const splitAmt = totalNum / tracker.memberNames.length;
      tracker.memberNames.forEach(m => {
        finalSplits[m] = splitAmt;
      });
    } else {
      let customSum = 0;
      Object.keys(customSplits).forEach(m => {
        customSum += (parseFloat(customSplits[m]) || 0);
      });
      if (Math.abs(customSum - totalNum) > 0.01) return;
      finalSplits = customSplits;
    }

    const payload = {
      description: desc,
      totalAmount: totalNum,
      payerName: payer,
      splitDetails: JSON.stringify(finalSplits)
    };

    setIsSubmitting(true);
    try {
      await axios.post(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}/tracker/expenses`, payload);
      setDesc('');
      setTotal('');
      setCustomSplits({});
      fetchTracker(); // Native reload
    } catch (error) {
      console.error('Failed to add expense', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await axios.delete(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}/tracker/expenses/${expenseId}`);
      fetchTracker();
    } catch (error) {
      console.error('Failed to delete expense', error);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#212121] flex items-center justify-center font-sans">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-2 border-[#212121]/10 border-t-[#212121] rounded-full animate-spin"></div>
        <p className="mt-4 text-[#212121]/50 tracking-widest text-[10px] uppercase">Loading expenses</p>
      </div>
    </div>
  );

  if (!tracker) return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-8 text-[#212121]"><p>Tracker not found.</p></div>;

  // Currency hardcoded to INR globally
  const currencySymbol = '₹';

  // Render logic... calculate sums
  const totalSpent = tracker.expenses ? tracker.expenses.reduce((sum, exp) => sum + exp.totalAmount, 0) : 0;
  const budgetRatio = (tracker.baseBudgetLimit ?? 0) > 0 ? Math.min(100, (totalSpent / tracker.baseBudgetLimit) * 100) : 0;

  // Debt Matrix calculation
  const balances = {};
  tracker.memberNames.forEach(m => balances[m] = 0);

  if (tracker.expenses) {
    tracker.expenses.forEach(exp => {
      if (balances[exp.payerName] !== undefined) {
        balances[exp.payerName] += exp.totalAmount; // Gets credited for paying
      }
      const splits = JSON.parse(exp.splitDetails);
      Object.keys(splits).forEach(person => {
        if (balances[person] !== undefined) {
          balances[person] -= splits[person]; // Gets debited for their share
        }
      });
    });
  }

  // Settlement Algorithm (Greedy Graph Resolver)
  const calculateSettlement = () => {
    let debtors = [];
    let creditors = [];
    
    Object.keys(balances).forEach(person => {
      if (balances[person] < -0.01) debtors.push({ person, amount: -balances[person] });
      if (balances[person] > 0.01) creditors.push({ person, amount: balances[person] });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let transactions = [];
    let d = 0, c = 0;

    while (d < debtors.length && c < creditors.length) {
       let debtor = debtors[d];
       let creditor = creditors[c];
       let minAmount = Math.min(debtor.amount, creditor.amount);

       transactions.push({ from: debtor.person, to: creditor.person, amount: minAmount });

       debtor.amount -= minAmount;
       creditor.amount -= minAmount;

       if (debtor.amount < 0.01) d++;
       if (creditor.amount < 0.01) c++;
    }
    return transactions;
  };

  const settlementTransactions = calculateSettlement();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#212121] font-sans selection:bg-[#212121]/10">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-xl border-b border-[#212121]/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(`/trip/${id}`)}
              className="w-10 h-10 rounded-full border border-[#212121]/10 flex items-center justify-center hover:bg-[#212121]/5 transition-colors"
            >
              <svg className="w-4 h-4 text-[#212121]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-serif tracking-wide text-[#212121]">Expense Tracker</h1>
              <p className="text-[10px] text-[#212121]/50 uppercase tracking-widest mt-1">Trip Reference: {id.substring(0,8)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Stats & Setup */}
        <div className="lg:col-span-4 space-y-12">
          
          {/* Budget Widget */}
          <section className="bg-white rounded-none p-8 border border-[#212121]/5 relative overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,0.02)]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-[#212121]/5">
              <div
                className="h-full bg-[#212121] transition-all duration-1000 ease-out"
                style={{ width: `${budgetRatio}%` }}
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] text-[#212121]/50 uppercase tracking-widest">Budget usage</h2>
              <button
                onClick={() => { setIsEditingBudget(!isEditingBudget); setBudgetDraft((tracker.baseBudgetLimit ?? 0).toFixed(2)); }}
                className="text-[9px] uppercase tracking-widest text-[#212121]/40 hover:text-[#212121] border border-[#212121]/10 hover:border-[#212121]/30 px-2 py-1 transition-all"
              >
                {isEditingBudget ? 'Cancel' : '✎ Edit Limit'}
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif text-[#212121]">{currencySymbol}{totalSpent.toFixed(2)}</span>
              <span className="text-[#212121]/40 text-sm">/ {currencySymbol}{(tracker.baseBudgetLimit ?? 0).toFixed(2)}</span>
            </div>

            {/* Inline Budget Editor */}
            {isEditingBudget && (
              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#212121]/40 text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    min="1"
                    value={budgetDraft}
                    onChange={e => setBudgetDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
                    className="w-full bg-[#FAFAFA] border border-[#212121]/10 rounded-none pl-7 pr-3 py-2 text-xs text-[#212121] outline-none focus:border-[#212121] transition-colors"
                    placeholder="New limit"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSaveBudget}
                  className="bg-[#212121] text-white text-[9px] uppercase tracking-widest px-4 py-2 hover:bg-[#212121]/80 transition-colors"
                >
                  Set
                </button>
              </div>
            )}

            <p className="mt-4 text-[10px] uppercase tracking-widest text-[#212121]/50">
              {budgetRatio >= 100 ? 'Budget exceeded.' : `${(100 - budgetRatio).toFixed(1)}% remaining.`}
            </p>
          </section>

          {/* Members Config */}
          <section className="space-y-4 pt-8">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-[#212121]/10 pb-2">People</h2>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                placeholder="Person's name"
                className="flex-1 bg-white border border-[#212121]/10 rounded-none px-4 py-3 text-xs text-[#212121] outline-none focus:border-[#212121] transition-colors placeholder-[#212121]/30"
              />
              <button 
                onClick={handleAddMember}
                className="bg-[#212121] text-white px-6 py-3 rounded-none text-[10px] tracking-widest uppercase hover:bg-black transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {tracker.memberNames.map(member => (
                <div key={member} className="flex items-center gap-2 bg-gray-50 border border-[#212121]/5 pr-1 pl-3 py-1 text-xs text-[#212121]">
                  {member}
                  <button 
                    onClick={() => handleRemoveMember(member)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-[#212121]/5 transition-colors text-[#212121]/40 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              {tracker.memberNames.length === 0 && (
                <div className="text-[10px] uppercase tracking-widest text-[#212121]/40 italic">No one added yet.</div>
              )}
            </div>
          </section>

          {/* Matrix Debt Summary */}
          {tracker.memberNames.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#212121]/10 pb-2">
                 <h2 className="text-[10px] text-[#212121]/50 uppercase tracking-widest">Net Positions</h2>
                 <button 
                    onClick={() => setShowSettleUp(!showSettleUp)}
                    className="text-[9px] uppercase tracking-widest bg-[#212121]/5 hover:bg-[#212121]/10 text-[#212121] px-2 py-1 transition-all"
                 >
                    {showSettleUp ? 'Hide details' : 'Calculate settlements'}
                 </button>
              </div>

              {showSettleUp && settlementTransactions.length > 0 && (
                 <div className="bg-[#212121] text-white p-4 text-xs font-mono mb-4 shadow-lg">
                    <p className="text-[9px] uppercase tracking-widest text-white/50 mb-3 border-b border-white/20 pb-2">How to settle up</p>
                    {settlementTransactions.map((tx, idx) => (
                       <div key={idx} className="flex justify-between items-center py-1">
                          <span><span className="text-red-400">{tx.from}</span> pays <span className="text-green-400">{tx.to}</span></span>
                          <span className="font-bold">₹{tx.amount.toFixed(2)}</span>
                       </div>
                    ))}
                 </div>
              )}
              
              {showSettleUp && settlementTransactions.length === 0 && (
                 <div className="bg-[#212121] text-white p-4 text-[10px] uppercase tracking-widest italic text-center mb-4">
                    Everything is settled.
                 </div>
              )}

              <div className="space-y-3">
                {Object.entries(balances).map(([person, bal]) => {
                  const isSettled = settledPersons.has(person);
                  const effectiveBal = isSettled ? 0 : bal;
                  const isDebtor = bal < -0.01;

                  const toggleSettle = () => {
                    setSettledPersons(prev => {
                      const next = new Set(prev);
                      if (next.has(person)) next.delete(person);
                      else next.add(person);
                      return next;
                    });
                  };

                  return (
                    <div key={person} className={`flex items-center justify-between bg-white border p-4 rounded-none shadow-[2px_2px_10px_rgba(0,0,0,0.01)] transition-all duration-300 ${
                      isSettled ? 'border-green-200 bg-green-50' : 'border-[#212121]/5'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isSettled && (
                          <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <span className={`text-xs uppercase tracking-widest ${
                          isSettled ? 'text-green-700 line-through decoration-green-400' : 'text-[#212121]'
                        }`}>{person}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-serif ${
                          isSettled ? 'text-green-600' :
                          effectiveBal > 0 ? 'text-green-700' :
                          effectiveBal < 0 ? 'text-red-500' : 'text-[#212121]/60'
                        }`}>
                          {isSettled ? 'Settled' : `${effectiveBal > 0 ? '+' : ''}${effectiveBal.toFixed(2)}`}
                        </span>

                        {/* Per-person settle up — only for debtors (negative balance) */}
                        {isDebtor && (
                          <button
                            onClick={toggleSettle}
                            className={`text-[9px] uppercase tracking-widest px-2 py-1 border transition-all duration-200 ${
                              isSettled
                                ? 'border-green-300 text-green-600 bg-green-50 hover:bg-green-100'
                                : 'border-[#212121]/20 text-[#212121]/60 hover:border-[#212121] hover:text-[#212121] hover:bg-[#212121]/5'
                            }`}
                          >
                            {isSettled ? '↩ Undo' : 'Settle Up'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

        {/* Right Column: Transactions */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Add Expense Panel */}
          {tracker.memberNames.length > 0 ? (
            <section className="bg-white rounded-none p-8 border border-[#212121]/5 shadow-[5px_5px_15px_rgba(0,0,0,0.02)]">
              <h2 className="text-[10px] text-[#212121]/50 uppercase tracking-widest mb-6">Add new expense</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input 
                  type="text" 
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="What was this for?"
                  className="bg-[#FAFAFA] border border-[#212121]/10 rounded-none px-4 py-3 text-xs text-[#212121] outline-none focus:border-[#212121] transition-colors"
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#212121]/40">{currencySymbol}</span>
                  <input 
                    type="number" 
                    min="0.01"
                    step="0.01"
                    value={total}
                    onChange={e => setTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#FAFAFA] border border-[#212121]/10 rounded-none pl-8 pr-4 py-3 text-xs text-[#212121] outline-none focus:border-[#212121] transition-colors"
                  />
                </div>
              </div>

              <div className="mb-6 flex gap-4 overflow-x-auto pb-2 items-center">
                <span className="text-[10px] uppercase tracking-widest text-[#212121]/50 py-2 min-w-max">Paid by:</span>
                {tracker.memberNames.map(m => (
                  <button 
                    key={m}
                    onClick={() => setPayer(m)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${payer === m ? 'bg-[#212121] text-white' : 'bg-white border border-[#212121]/10 text-[#212121]/60 hover:border-[#212121]/30'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="mb-8">
                <div className="flex gap-4 mb-4 items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#212121]/50 py-2 min-w-max">How to split:</span>
                  <button 
                    onClick={() => setSplitMode('Equal')}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${splitMode === 'Equal' ? 'bg-[#212121]/5 text-[#212121] font-bold border border-[#212121]' : 'text-[#212121]/50 hover:text-[#212121] border border-transparent'}`}
                  >
                    Equal
                  </button>
                  <button 
                    onClick={() => setSplitMode('Custom')}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${splitMode === 'Custom' ? 'bg-[#212121]/5 text-[#212121] font-bold border border-[#212121]' : 'text-[#212121]/50 hover:text-[#212121] border border-transparent'}`}
                  >
                    Custom
                  </button>
                </div>

                {splitMode === 'Custom' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FAFAFA] border border-[#212121]/10">
                    {tracker.memberNames.map(m => (
                      <div key={m} className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-[#212121]/50 pl-1">{m}</label>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={customSplits[m] || ''}
                          onChange={e => setCustomSplits({...customSplits, [m]: parseFloat(e.target.value) || 0})}
                          className="w-full bg-white border border-[#212121]/10 px-3 py-2 text-xs text-[#212121] outline-none focus:border-[#212121]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end">
                {(() => {
                  const numTot = parseFloat(total) || 0;
                  const cSum = Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                  const isMiss = splitMode === 'Custom' && Math.abs(cSum - numTot) > 0.01;
                  const isBlock = !desc || !total || !payer || numTot <= 0 || isMiss;
                  return (
                    <>
                      {isMiss && numTot > 0 && (
                        <span className="text-red-500/80 text-[9px] uppercase tracking-widest mb-3 transition-opacity">
                          Total doesn't match: {currencySymbol}{cSum.toFixed(2)} allocated out of {currencySymbol}{numTot.toFixed(2)}
                        </span>
                      )}
                      <button 
                        onClick={handleAddExpense}
                        disabled={isBlock || isSubmitting}
                        className="bg-[#212121] text-white px-8 py-3 text-[10px] uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? 'Saving...' : 'Save expense'}
                      </button>
                    </>
                  );
                })()}
              </div>
            </section>
          ) : (
            <div className="bg-white p-12 border border-[#212121]/5 text-center shadow-[5px_5px_15px_rgba(0,0,0,0.02)]">
              <svg className="w-12 h-12 text-[#212121]/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-primary font-serif font-bold text-lg tracking-wide">No people added yet</h3>
              <p className="text-[#212121]/50 text-sm mt-2">Add people on the left to start splitting expenses.</p>
            </div>
          )}

          {/* ── Per-Person Expense Breakdown ─────────────────────────────── */}
          {tracker.memberNames.length > 0 && tracker.expenses && tracker.expenses.length > 0 && (
            <section className="space-y-3 pt-8">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-[#212121]/10 pb-2">
              Per Person
            </h2>

              {tracker.memberNames.map(person => {
                // Expenses this person paid
                const paid = tracker.expenses.filter(e => e.payerName === person);
                const totalPaid = paid.reduce((s, e) => s + e.totalAmount, 0);

                // Expenses this person has a share in
                const involved = tracker.expenses.filter(e => {
                  const splits = JSON.parse(e.splitDetails || '{}');
                  return splits[person] !== undefined;
                });
                const totalOwed = involved.reduce((s, e) => {
                  const splits = JSON.parse(e.splitDetails || '{}');
                  return s + (splits[person] || 0);
                }, 0);

                const net = totalPaid - totalOwed;
                const isOpen = expandedPerson === person;

                // All expenses this person touched (either paid or split)
                const allRelated = tracker.expenses.filter(e => {
                  const splits = JSON.parse(e.splitDetails || '{}');
                  return e.payerName === person || splits[person] !== undefined;
                });

                return (
                  <div key={person} className="border border-[#212121]/5 bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.01)]">
                    {/* Header row — click to expand */}
                    <button
                      onClick={() => setExpandedPerson(isOpen ? null : person)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#212121]/5 flex items-center justify-center">
                          <span className="text-[10px] uppercase font-bold text-[#212121]/60">
                            {person.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs uppercase tracking-widest text-[#212121]">{person}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="text-[9px] uppercase tracking-widest text-green-600">
                          Paid {currencySymbol}{totalPaid.toFixed(2)}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-[#212121]/40">
                          Owes {currencySymbol}{totalOwed.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-serif font-bold ${
                          net > 0.01 ? 'text-green-600' : net < -0.01 ? 'text-red-500' : 'text-[#212121]/40'
                        }`}>
                          {net > 0 ? '+' : ''}{net.toFixed(2)}
                        </span>
                        <svg
                          className={`w-3 h-3 text-[#212121]/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded transaction list */}
                    {isOpen && (
                      <div className="border-t border-[#212121]/5 divide-y divide-[#212121]/5">
                        {allRelated.length === 0 ? (
                          <p className="text-[10px] text-[#212121]/30 uppercase tracking-widest p-4 italic">No transactions.</p>
                        ) : (
                          allRelated.map(exp => {
                            const splits = JSON.parse(exp.splitDetails || '{}');
                            const myShare = splits[person] || 0;
                            const isPayer = exp.payerName === person;
                            return (
                              <div key={exp.id} className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA]">
                                <div className="space-y-0.5">
                                  <p className="text-xs text-[#212121]">{exp.description}</p>
                                  <div className="flex items-center gap-2">
                                    {isPayer && (
                                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 uppercase tracking-wider">
                                        Paid
                                      </span>
                                    )}
                                    {myShare > 0 && (
                                      <span className="text-[9px] bg-[#212121]/5 text-[#212121]/50 px-1.5 py-0.5 uppercase tracking-wider">
                                        Share: {currencySymbol}{myShare.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {isPayer && (
                                    <p className="text-[11px] font-serif text-green-700">+{currencySymbol}{exp.totalAmount.toFixed(2)}</p>
                                  )}
                                  {myShare > 0 && (
                                    <p className="text-[11px] font-serif text-[#212121]/40">-{currencySymbol}{myShare.toFixed(2)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        {/* Person totals footer */}
                        <div className="flex justify-between items-center px-4 py-2 bg-[#212121]/[0.02]">
                          <span className="text-[9px] uppercase tracking-widest text-[#212121]/40">Net Position</span>
                          <span className={`text-xs font-serif font-bold ${
                            net > 0.01 ? 'text-green-600' : net < -0.01 ? 'text-red-500' : 'text-[#212121]/40'
                          }`}>
                            {net > 0 ? '+' : ''}{net.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* Transactions List */}
          <section className="space-y-4 pt-8">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-[#212121]/10 pb-2">All Expenses</h2>
            
            {(!tracker.expenses || tracker.expenses.length === 0) ? (
              <p className="text-[#212121]/40 text-sm italic py-4">No expenses added yet.</p>
            ) : (
              <div className="space-y-3">
                {tracker.expenses.slice().reverse().map(exp => (
                  <div key={exp.id} className="group flex items-center justify-between bg-white border border-[#212121]/5 p-4 hover:border-[#212121]/20 transition-colors shadow-[2px_2px_10px_rgba(0,0,0,0.01)]">
                    <div className="space-y-1">
                      <p className="text-[#212121] text-sm serif">{exp.description}</p>
                      <p className="text-[#212121]/40 text-[10px] uppercase tracking-widest">Added by {exp.payerName}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-[#212121] font-serif tracking-wide border-b border-[#212121]/10">{currencySymbol}{exp.totalAmount.toFixed(2)}</span>
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 transition-all duration-300"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default ExpenseTrackerView;
