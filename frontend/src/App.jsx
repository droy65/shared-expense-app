import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const CATEGORIES = ['Rent', 'Utilities', 'Food', 'Travel', 'Entertainment', 'Other'];
const CATEGORY_COLORS = {
  Rent: '#ff0054',
  Utilities: '#ff9f1c',
  Food: '#00f5d4',
  Travel: '#00bbf9',
  Entertainment: '#9d4edd',
  Other: '#6c757d'
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, group, import-resolver, reports
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard states
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');

  // Group Details states
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [debts, setDebts] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  
  // Rohan's Request: Drilldown ledger state
  const [selectedLedgerUser, setSelectedLedgerUser] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Group forms
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addSettlementOpen, setAddSettlementOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberJoinDate, setNewMemberJoinDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Expense Form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expCur, setExpCur] = useState('INR');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expSplitType, setExpSplitType] = useState('EQUAL');
  const [expCategory, setExpCategory] = useState('Food');
  const [expMemberShares, setExpMemberShares] = useState({}); // userId -> share/percent/amount

  // Settlement Form state
  const [setPaidBy, setSetPaidBy] = useState('');
  const [setReceivedBy, setSetReceivedBy] = useState('');
  const [setAmt, setSetAmt] = useState('');
  const [setCur, setSetCur] = useState('INR');
  const [setDate, setSetDate] = useState(new Date().toISOString().split('T')[0]);

  // CSV Importer states
  const [csvFile, setCsvFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [nameMappings, setNameMappings] = useState({});
  const [usdExchangeRate, setUsdExchangeRate] = useState('83');
  const [resolverRows, setResolverRows] = useState([]);
  const [resolverImportName, setResolverImportName] = useState('Flat Expenses');

  // Import Reports
  const [reports, setReports] = useState([]);

  // Fetch groups on login
  useEffect(() => {
    if (token) {
      fetchGroups();
    }
  }, [token]);

  // Theme effect
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const apiRequest = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'API request failed');
    }
    return res.json();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (authMode === 'register') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setSuccess('Registration successful! Please login.');
        setAuthMode('login');
      } else {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveView('dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickLogin = async (flatmateEmail, flatmateName) => {
    setError('');
    try {
      try {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: flatmateEmail, password: 'password123' }),
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveView('dashboard');
      } catch (loginErr) {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: flatmateName, email: flatmateEmail, password: 'password123' }),
        });
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: flatmateEmail, password: 'password123' }),
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveView('dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveView('dashboard');
  };

  const fetchGroups = async () => {
    try {
      const data = await apiRequest('/groups');
      setGroups(data);
    } catch (err) {
      console.error(err);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await apiRequest('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName }),
      });
      setNewGroupName('');
      fetchGroups();
    } catch (err) {
      alert(err.message);
    }
  };

  const selectGroup = async (group) => {
    setSelectedGroup(group);
    setActiveView('group');
    setSelectedLedgerUser(null);
    setSearchQuery('');
    setSelectedCategoryFilter('All');
    await fetchGroupDetails(group.id);
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const members = await apiRequest(`/groups/${groupId}/members`);
      setGroupMembers(members);
      
      const exps = await apiRequest(`/expenses/group/${groupId}`);
      setExpenses(exps);

      const sets = await apiRequest(`/settlements/group/${groupId}`);
      setSettlements(sets);

      const balData = await apiRequest(`/expenses/group/${groupId}/balances`);
      setBalances(balData.balances);
      setDebts(balData.debts);
      setCategoryTotals(balData.categoryTotals || {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newMemberEmail, joinDate: newMemberJoinDate }),
      });
      setNewMemberEmail('');
      setAddMemberOpen(false);
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeaveGroup = async (membershipId) => {
    const leaveDate = prompt("Enter leave date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!leaveDate) return;
    try {
      await apiRequest(`/groups/members/${membershipId}/leave`, {
        method: 'PATCH',
        body: JSON.stringify({ leaveDate }),
      });
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const shares = [];
      const amt = parseFloat(expAmt);
      const activeIds = Object.keys(expMemberShares).filter(id => expMemberShares[id]);
      
      if (expSplitType === 'EQUAL') {
        const shareVal = amt / activeIds.length;
        activeIds.forEach(id => {
          shares.push({ userId: parseInt(id), shareAmount: shareVal });
        });
      } else if (expSplitType === 'EXACT') {
        activeIds.forEach(id => {
          shares.push({ userId: parseInt(id), shareAmount: parseFloat(expMemberShares[id]) || 0 });
        });
      } else if (expSplitType === 'PERCENTAGE') {
        activeIds.forEach(id => {
          const pct = parseFloat(expMemberShares[id]) || 0;
          shares.push({ userId: parseInt(id), shareAmount: (pct / 100) * amt });
        });
      }

      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          amount: amt,
          currency: expCur,
          description: expDesc,
          expenseDate: expDate,
          splitType: expSplitType,
          paidBy: parseInt(expPaidBy),
          category: expCategory,
          shares
        }),
      });

      setAddExpenseOpen(false);
      setExpDesc('');
      setExpAmt('');
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSettlement = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/settlements', {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          amount: parseFloat(setAmt),
          currency: setCur,
          paidById: parseInt(setPaidBy),
          receivedById: parseInt(setReceivedBy),
          settlementDate: setDate,
        }),
      });
      setAddSettlementOpen(false);
      setSetAmt('');
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerQuickSettle = (fromId, toId, amount) => {
    setSetPaidBy(fromId.toString());
    setSetReceivedBy(toId.toString());
    setSetAmt(amount.toFixed(2));
    setSetCur('INR');
    setSetDate(new Date().toISOString().split('T')[0]);
    setAddSettlementOpen(true);
  };

  // CSV Import handling
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      try {
        const data = await apiRequest('/import/analyze', {
          method: 'POST',
          body: JSON.stringify({ csvText: text }),
        });
        setAnalysisResult(data);

        // Prepopulate name mappings
        const mappings = {};
        data.uniqueNames.forEach(name => {
          let clean = name.trim();
          if (clean.toLowerCase() === 'priya s') clean = 'Priya';
          if (clean.toLowerCase() === 'priya') clean = 'Priya';
          if (clean.toLowerCase() === 'rohan ') clean = 'Rohan';
          clean = clean.charAt(0).toUpperCase() + clean.slice(1).trim();
          mappings[name] = clean;
        });
        setNameMappings(mappings);

        // Prepopulate resolver rows
        const initialRows = data.processedRows.map(row => {
          let action = 'import_expense';
          
          if (row.isDuplicate) {
            action = 'skip';
          }
          const rawDesc = (row.rawRow.description || '').toLowerCase();
          if (!row.rawRow.split_type || rawDesc.includes('paid') || rawDesc.includes('settled') || rawDesc.includes('deposit share')) {
            action = 'import_settlement';
          }

          let cleanAmt = (row.rawRow.amount || '').replace(/"/g, '').replace(/,/g, '');
          let cleanCur = row.rawRow.currency || 'INR';
          if (!cleanCur) cleanCur = 'INR';

          let cleanPaidBy = row.rawRow.paid_by || '';
          if (!cleanPaidBy && rawDesc.includes('cleaning')) {
            cleanPaidBy = 'Aisha';
          }

          let cleanSplitWith = row.rawRow.split_with || '';
          let cleanSplitDetails = row.rawRow.split_details || '';

          if (row.rawRow.date === '2026-04-02' && rawDesc.includes('groceries') && cleanSplitWith.includes('Meera')) {
            cleanSplitWith = cleanSplitWith.replace(';Meera', '').replace('Meera;', '');
          }

          return {
            ...row,
            action,
            resolvedData: {
              date: row.parsedDate || row.rawRow.date,
              description: row.rawRow.description,
              amount: cleanAmt,
              currency: cleanCur,
              paid_by: cleanPaidBy,
              split_type: row.rawRow.split_type || 'equal',
              split_with: cleanSplitWith,
              split_details: cleanSplitDetails,
              category: row.autoCategory || 'Other',
            }
          };
        });
        setResolverRows(initialRows);
        setActiveView('import-resolver');
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    try {
      await apiRequest('/import/commit', {
        method: 'POST',
        body: JSON.stringify({
          groupName: resolverImportName,
          rows: resolverRows,
          nameMappings,
          usdExchangeRate,
        }),
      });
      alert('Import committed successfully!');
      setActiveView('dashboard');
      fetchGroups();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await apiRequest('/import/reports');
      setReports(data);
      setActiveView('reports');
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter and Search Logic
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exp.User && exp.User.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === 'All' || exp.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalSpent = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  // Simple SVG Donut Chart Calculation
  let cumulativePercent = 0;
  const donutSlices = Object.keys(categoryTotals).map((cat) => {
    const val = categoryTotals[cat];
    const pct = totalSpent > 0 ? (val / totalSpent) * 100 : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += pct;
    return {
      category: cat,
      percentage: pct,
      startPercent,
      color: CATEGORY_COLORS[cat] || '#6c757d',
    };
  });

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', background: 'linear-gradient(135deg, #00f5d4, #9d4edd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>Spreetail Expenses</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Visual and transparent peer-to-peer expense manager</p>
          </div>
          
          {error && <div className="badge badge-danger" style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
          {success && <div className="badge badge-success" style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '15px', textAlign: 'center' }}>{success}</div>}

          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="#" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontSize: '0.9rem' }} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </a>
          </div>

          <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', textAlign: 'center' }}>Demo Quick Login</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleQuickLogin('aisha@flatmates.com', 'Aisha')}>Aisha</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleQuickLogin('rohan@flatmates.com', 'Rohan')}>Rohan</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleQuickLogin('priya@flatmates.com', 'Priya')}>Priya</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleQuickLogin('meera@flatmates.com', 'Meera')}>Meera</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleQuickLogin('sam@flatmates.com', 'Sam')}>Sam</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="nav-logo" onClick={() => setActiveView('dashboard')} style={{ cursor: 'pointer' }}>
          <span>💸</span> Spreetail Expense app
        </div>
        <div className="nav-links">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Logged in as: <strong>{user.name}</strong></span>
          <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={fetchReports}>Import Reports</button>
          <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: '30px 40px' }}>
        {activeView === 'dashboard' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h1 style={{ fontSize: '2rem' }}>Groups Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Select a group or import a spreadsheet to get started.</p>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label className="btn btn-success" style={{ cursor: 'pointer' }}>
                  <span>📥</span> Import CSV
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
                </label>
              </div>
            </div>

            <div className="grid-2">
              <div className="glass-card">
                <h2 style={{ marginBottom: '20px', fontSize: '1.25rem', color: 'var(--accent-light)' }}>Create New Group</h2>
                <form onSubmit={createGroup}>
                  <div className="form-group">
                    <label className="form-label">Group Name</label>
                    <input type="text" className="form-input" placeholder="e.g. 4BHK Flatmates" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Group</button>
                </form>
              </div>

              <div className="glass-card">
                <h2 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>Your Active Groups</h2>
                {groups.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active groups found. Create one or import the CSV file.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {groups.map(group => (
                      <div key={group.id} className="glass-card glow-effect" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }} onClick={() => selectGroup(group)}>
                        <div>
                          <strong style={{ fontSize: '1.1rem' }}>{group.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created on: {new Date(group.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span style={{ fontSize: '1.2rem', color: 'var(--accent-light)' }}>➔</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'import-resolver' && analysisResult && (
          <div className="fade-in">
            <div style={{ marginBottom: '30px' }}>
              <button className="btn btn-secondary" style={{ marginBottom: '15px' }} onClick={() => setActiveView('dashboard')}>✕ Cancel Import</button>
              <h1 style={{ fontSize: '2rem' }}>CSV Import Conflict Resolver</h1>
              <p style={{ color: 'var(--text-secondary)' }}>We found <strong>{analysisResult.anomalies.length}</strong> anomalies in your file. Review and choose the action for each row.</p>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start' }}>
              <div className="glass-card" style={{ position: 'sticky', top: '90px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--warning-color)' }}>Settings & Mappings</h2>
                
                <div className="form-group">
                  <label className="form-label">Import Group Name</label>
                  <input type="text" className="form-input" value={resolverImportName} onChange={e => setResolverImportName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">USD exchange rate (1 USD = ? INR)</label>
                  <input type="number" className="form-input" value={usdExchangeRate} onChange={e => setUsdExchangeRate(e.target.value)} />
                  <small style={{ color: 'var(--text-muted)' }}>Priya's trip has USD expenses. They will convert to INR at this rate.</small>
                </div>

                <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px' }}>Member Name Mappings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analysisResult.uniqueNames.map(rawName => (
                    <div key={rawName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rawName}</span>
                      <input type="text" className="form-input" style={{ padding: '6px 10px', fontSize: '0.85rem', width: '130px' }} value={nameMappings[rawName] || ''} onChange={e => {
                        const val = e.target.value;
                        setNameMappings(prev => ({ ...prev, [rawName]: val }));
                      }} />
                    </div>
                  ))}
                </div>

                <button className="btn btn-success" style={{ width: '100%', marginTop: '20px' }} onClick={handleCommitImport}>
                  Commit Cleaned Import 🚀
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Rows Ledger & Resolution Log</h2>
                {resolverRows.map((row, idx) => {
                  const hasAnom = row.anomalies && row.anomalies.length > 0;
                  return (
                    <div key={idx} className="glass-card" style={{ borderLeft: hasAnom ? `4px solid ${row.isDuplicate ? 'var(--text-muted)' : 'var(--danger-color)'}` : '1px solid var(--glass-border)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span className="badge badge-info" style={{ marginRight: '8px' }}>Row {row.rowIndex}</span>
                          <strong>{row.rawRow.description || '(No description)'}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Date: {row.rawRow.date} | Amount: {row.rawRow.amount} {row.rawRow.currency || 'INR'} | Paid by: {row.rawRow.paid_by || 'Unknown'}
                          </div>
                        </div>
                        <div>
                          <select className="form-input" style={{ padding: '6px 12px', fontSize: '0.85rem', width: '180px' }} value={row.action} onChange={e => {
                            const val = e.target.value;
                            setResolverRows(prev => prev.map((r, i) => i === idx ? { ...r, action: val } : r));
                          }}>
                            <option value="import_expense">Import as Expense</option>
                            <option value="import_settlement">Import as Settlement</option>
                            <option value="skip">Skip / Delete Row</option>
                          </select>
                        </div>
                      </div>

                      {hasAnom && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--warning-color)', textTransform: 'uppercase' }}>Anomalies Detected:</span>
                          {row.anomalies.map((anom, aIdx) => (
                            <div key={aIdx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              ⚠️ <strong>{anom.type}</strong>: {anom.description}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Edit resolved row values inline if needed */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '12px', borderTop: '1px dashed var(--glass-border)', paddingTop: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date</label>
                          <input type="text" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={row.resolvedData.date} onChange={e => {
                            const val = e.target.value;
                            setResolverRows(prev => prev.map((r, i) => i === idx ? { ...r, resolvedData: { ...r.resolvedData, date: val } } : r));
                          }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount</label>
                          <input type="text" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={row.resolvedData.amount} onChange={e => {
                            const val = e.target.value;
                            setResolverRows(prev => prev.map((r, i) => i === idx ? { ...r, resolvedData: { ...r.resolvedData, amount: val } } : r));
                          }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payer</label>
                          <input type="text" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={row.resolvedData.paid_by} onChange={e => {
                            const val = e.target.value;
                            setResolverRows(prev => prev.map((r, i) => i === idx ? { ...r, resolvedData: { ...r.resolvedData, paid_by: val } } : r));
                          }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Category</label>
                          <select className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={row.resolvedData.category} onChange={e => {
                            const val = e.target.value;
                            setResolverRows(prev => prev.map((r, i) => i === idx ? { ...r, resolvedData: { ...r.resolvedData, category: val } } : r));
                          }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === 'reports' && (
          <div className="fade-in">
            <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setActiveView('dashboard')}>➔ Back to Dashboard</button>
            <h1 style={{ marginBottom: '20px' }}>CSV Import Reports</h1>
            {reports.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No CSV imports have been logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {reports.map((report, idx) => (
                  <div key={idx} className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px' }}>
                      <div>
                        <h3>{report.fileName}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Imported by: {report.importer ? report.importer.name : 'Unknown'} on {new Date(report.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="badge badge-success">{report.status}</span>
                    </div>
                    <h4>Anomalies Resolved ({report.AnomalyLogs ? report.AnomalyLogs.length : 0}):</h4>
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {report.AnomalyLogs && report.AnomalyLogs.map((log, lIdx) => (
                        <div key={lIdx} style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--warning-color)' }}>
                          <strong>Row {log.rowNumber} [{log.anomalyType}]</strong>: {log.description}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Resolution: {log.resolutionAction} | Status: {log.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'group' && selectedGroup && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <button className="btn btn-secondary" style={{ padding: '4px 12px', marginBottom: '10px' }} onClick={() => setActiveView('dashboard')}>➔ Back</button>
                <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #00f5d4, #7b2cbf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>{selectedGroup.name}</h1>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => {
                  if (groupMembers.length > 0) {
                    setExpPaidBy(groupMembers[0].User.id.toString());
                    const initialShares = {};
                    groupMembers.forEach(m => {
                      initialShares[m.User.id] = '';
                    });
                    setExpMemberShares(initialShares);
                  }
                  setAddExpenseOpen(true);
                }}>➕ Add Expense</button>
                <button className="btn btn-secondary" onClick={() => {
                  if (groupMembers.length > 1) {
                    setSetPaidBy(groupMembers[0].User.id.toString());
                    setSetReceivedBy(groupMembers[1].User.id.toString());
                  }
                  setAddSettlementOpen(true);
                }}>💸 Settle Debts</button>
                <button className="btn btn-secondary" onClick={() => setAddMemberOpen(true)}>👤 Add Member</button>
              </div>
            </div>

            {/* Premium Analytics Banner */}
            <div className="grid-2" style={{ marginBottom: '30px', gridTemplateColumns: '1.2fr 1fr' }}>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'var(--success-color)' }}>Group Spending Analytics</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
                  Total group-wise spending in base currency: <strong style={{ color: '#fff', fontSize: '1.2rem' }}>₹{totalSpent.toFixed(2)}</strong>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {Object.keys(categoryTotals).map((cat) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS[cat] }}></span>
                      <span style={{ fontSize: '0.85rem' }}>{cat}: <strong>₹{categoryTotals[cat].toFixed(0)}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
                {totalSpent > 0 ? (
                  <svg width="150" height="150" viewBox="0 0 42 42" className="donut">
                    <circle className="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="transparent"></circle>
                    <circle className="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="3.8"></circle>
                    
                    {donutSlices.map((slice, sIdx) => (
                      <circle
                        key={sIdx}
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="3.8"
                        strokeDasharray={`${slice.percentage} ${100 - slice.percentage}`}
                        strokeDashoffset={100 - slice.startPercent + 25}
                      ></circle>
                    ))}
                  </svg>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No expenses recorded yet.</p>
                )}
              </div>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '15px', color: 'var(--success-color)' }}>Who Pays Whom (Aisha's View)</h2>
                  {debts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>All settled up! No debts outstanding.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {debts.map((debt, dIdx) => (
                        <div key={dIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--accent-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              <strong style={{ color: '#ff5c8a' }}>{debt.fromName}</strong> owes <strong style={{ color: 'var(--success-color)' }}>{debt.toName}</strong>
                            </span>
                            <strong style={{ fontSize: '1.1rem' }}>₹{debt.amount.toFixed(2)}</strong>
                          </div>
                          <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%', marginTop: '5px' }} onClick={() => triggerQuickSettle(debt.fromId, debt.toId, debt.amount)}>
                            ⚡ Quick Settle Payment
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-card">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '15px' }}>Balances & Ledger</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {balances.map(bal => {
                      const isOwed = bal.netBalance > 0.01;
                      const isOwes = bal.netBalance < -0.01;
                      return (
                        <div key={bal.id} className="glow-effect" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedLedgerUser(bal)}>
                          <div>
                            <strong>{bal.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid: ₹{bal.totalPaid.toFixed(2)} | Share: ₹{bal.totalOwed.toFixed(2)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ color: isOwed ? 'var(--success-color)' : isOwes ? 'var(--danger-color)' : 'var(--text-muted)' }}>
                              {isOwed ? `+₹${bal.netBalance.toFixed(2)}` : isOwes ? `-₹${Math.abs(bal.netBalance).toFixed(2)}` : '₹0.00'}
                            </strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-light)', marginTop: '2px' }}>Click to view details</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-card">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '15px' }}>Group Members</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {groupMembers.map(member => (
                      <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                        <div>
                          <strong>{member.User.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined: {member.joinDate} {member.leaveDate ? `| Left: ${member.leaveDate}` : ''}</div>
                        </div>
                        {member.status === 'ACTIVE' ? (
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger-color)' }} onClick={() => handleLeaveGroup(member.id)}>Leave</button>
                        ) : (
                          <span className="badge badge-danger">LEFT</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Ledger details / Activity Ledger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {selectedLedgerUser && (
                  <div className="glass-card fade-in" style={{ borderLeft: '4px solid var(--accent-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h2 style={{ fontSize: '1.4rem' }}>{selectedLedgerUser.name}'s Ledger Breakdown (Rohan's View)</h2>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setSelectedLedgerUser(null)}>✕ Close</button>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
                      Every transaction contributing to the net balance of <strong>₹{selectedLedgerUser.netBalance.toFixed(2)}</strong>.
                    </p>

                    <div className="table-container">
                      <table className="app-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Original Amt</th>
                            <th>Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLedgerUser.breakdown.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.date}</td>
                              <td>{item.details}</td>
                              <td>
                                <span className={`badge ${item.type.startsWith('PAY') || item.type.includes('SENT') ? 'badge-success' : 'badge-danger'}`}>
                                  {item.type}
                                </span>
                              </td>
                              <td style={{ color: item.amount >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                {item.originalAmount >= 0 ? '+' : ''}{item.originalAmount.toFixed(2)} {item.originalCurrency}
                              </td>
                              <td style={{ fontWeight: 'bold', color: item.amount >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                {item.amount >= 0 ? '+' : ''}₹{item.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ fontSize: '1.4rem' }}>Transaction Ledger</h2>
                    
                    {/* Search & Filter controls */}
                    <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
                      <input type="text" className="form-input" style={{ maxWidth: '200px', padding: '8px 12px', fontSize: '0.85rem' }} placeholder="Search transactions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                      <select className="form-input" style={{ maxWidth: '130px', padding: '8px 12px', fontSize: '0.85rem' }} value={selectedCategoryFilter} onChange={e => setSelectedCategoryFilter(e.target.value)}>
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table className="app-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Paid By</th>
                          <th>Total Amount</th>
                          <th>Category & Split</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((exp, idx) => (
                          <tr key={idx}>
                            <td>{exp.expenseDate}</td>
                            <td>
                              <strong>{exp.description}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Splits: {exp.Users ? exp.Users.map(u => `${u.name} (₹${parseFloat(u.ExpenseShare.shareAmount).toFixed(2)})`).join(', ') : ''}
                              </div>
                            </td>
                            <td>{exp.User ? exp.User.name : 'Unknown'}</td>
                            <td style={{ fontWeight: 'bold' }}>{parseFloat(exp.amount).toFixed(2)} {exp.currency}</td>
                            <td>
                              <span style={{ marginRight: '5px', backgroundColor: CATEGORY_COLORS[exp.category] || '#6c757d' }} className="badge">
                                {exp.category}
                              </span>
                              <span className="badge badge-info">{exp.splitType}</span>
                            </td>
                          </tr>
                        ))}
                        {settlements.map((set, idx) => (
                          <tr key={idx} style={{ background: 'rgba(0, 245, 212, 0.02)' }}>
                            <td>{set.settlementDate}</td>
                            <td>
                              <strong>Payment Settlement</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--success-color)' }}>
                                {set.paidBy ? set.paidBy.name : 'Unknown'} settled with {set.receivedBy ? set.receivedBy.name : 'Unknown'}
                              </div>
                            </td>
                            <td>{set.paidBy ? set.paidBy.name : 'Unknown'}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>{parseFloat(set.amount).toFixed(2)} {set.currency}</td>
                            <td>
                              <span className="badge badge-success">SETTLEMENT</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {addExpenseOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', color: 'var(--accent-light)' }}>Log New Expense</h2>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" className="form-input" required value={expDesc} onChange={e => setExpDesc(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" step="any" className="form-input" required value={expAmt} onChange={e => setExpAmt(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-input" value={expCur} onChange={e => setExpCur(e.target.value)}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" required value={expDate} onChange={e => setExpDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Paid By</label>
                <select className="form-input" value={expPaidBy} onChange={e => setExpPaidBy(e.target.value)}>
                  {groupMembers.map(m => (
                    <option key={m.User.id} value={m.User.id}>{m.User.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Split Strategy</label>
                <select className="form-input" value={expSplitType} onChange={e => setExpSplitType(e.target.value)}>
                  <option value="EQUAL">EQUAL</option>
                  <option value="EXACT">EXACT / UNEQUAL</option>
                  <option value="PERCENTAGE">PERCENTAGE</option>
                </select>
              </div>

              {expSplitType !== 'EQUAL' && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px', marginTop: '15px', marginBottom: '15px' }}>
                  <label className="form-label">Split details ({expSplitType === 'PERCENTAGE' ? '%' : 'Amount'})</label>
                  {groupMembers.map(m => (
                    <div key={m.User.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{m.User.name}</span>
                      <input type="number" className="form-input" style={{ width: '120px', padding: '6px' }} value={expMemberShares[m.User.id] || ''} onChange={e => {
                        const val = e.target.value;
                        setExpMemberShares(prev => ({ ...prev, [m.User.id]: val }));
                      }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Expense</button>
                <button type="button" className="btn btn-secondary" onClick={() => setAddExpenseOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '20px' }}>Add Group Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">Member Email</label>
                <input type="email" className="form-input" required placeholder="name@flatmates.com" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input type="date" className="form-input" required value={newMemberJoinDate} onChange={e => setNewMemberJoinDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Member</button>
                <button type="button" className="btn btn-secondary" onClick={() => setAddMemberOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {addSettlementOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px' }}>
            <h2 style={{ marginBottom: '20px', color: 'var(--success-color)' }}>Record Settlement Payment</h2>
            <form onSubmit={handleAddSettlement}>
              <div className="form-group">
                <label className="form-label">Payer</label>
                <select className="form-input" value={setPaidBy} onChange={e => setSetPaidBy(e.target.value)}>
                  {groupMembers.map(m => (
                    <option key={m.User.id} value={m.User.id}>{m.User.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Receiver</label>
                <select className="form-input" value={setReceivedBy} onChange={e => setSetReceivedBy(e.target.value)}>
                  {groupMembers.map(m => (
                    <option key={m.User.id} value={m.User.id}>{m.User.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" step="any" className="form-input" required value={setAmt} onChange={e => setSetAmt(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-input" value={setCur} onChange={e => setSetCur(e.target.value)}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" required value={setDate} onChange={e => setDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Settlement</button>
                <button type="button" className="btn btn-secondary" onClick={() => setAddSettlementOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
