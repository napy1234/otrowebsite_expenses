import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// Interfaces
interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'fixed-expense' | 'variable-expense';
    category?: string;
    date: string;
    user: string;
}

// Constants
const DEFAULT_CATEGORIES = ['Comida', 'Transporte', 'Ocio', 'Hogar', 'Salud', 'Educación'];
const DEFAULT_USERS = ['Usuario 1', 'Usuario 2'];
const DEFAULT_BUDGET = 2000;

// Helper to get data from localStorage
const useLocalStorage = <T,>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue] as const;
};


// App Component
const App = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [categories, setCategories] = useLocalStorage<string[]>('categories', DEFAULT_CATEGORIES);
    const [users, setUsers] = useLocalStorage<string[]>('users', DEFAULT_USERS);
    const [budget, setBudget] = useLocalStorage<number>('budget', DEFAULT_BUDGET);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [isManagingUsers, setIsManagingUsers] = useState(false);

    const { totalIncome, totalFixedExpenses, totalVariableExpenses } = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.totalIncome += t.amount;
            if (t.type === 'fixed-expense') acc.totalFixedExpenses += t.amount;
            if (t.type === 'variable-expense') acc.totalVariableExpenses += t.amount;
            return acc;
        }, { totalIncome: 0, totalFixedExpenses: 0, totalVariableExpenses: 0 });
    }, [transactions]);
    
    const totalExpenses = totalFixedExpenses + totalVariableExpenses;
    const remainingBudget = budget + totalIncome - totalExpenses;

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction = { ...transaction, id: crypto.randomUUID() };
        setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };
    
    const addCategory = (category: string) => {
      if (category && !categories.includes(category)) {
        setCategories(prev => [...prev, category]);
      }
    };
    
    const deleteCategory = (categoryToDelete: string) => {
      setCategories(prev => prev.filter(c => c !== categoryToDelete));
    };

    const addUser = (user: string) => {
      if (user && !users.includes(user)) {
        setUsers(prev => [...prev, user]);
      }
    };
    
    const deleteUser = (userToDelete: string) => {
      setUsers(prev => prev.filter(u => u !== userToDelete));
    };

    const exportToCsv = () => {
        if (transactions.length === 0) {
            alert("No hay transacciones para exportar.");
            return;
        }

        const headers = ['ID', 'Descripción', 'Monto', 'Tipo', 'Categoría', 'Fecha', 'Usuario'];
        
        // Helper to format a cell, wrapping in quotes if it contains a comma
        const formatCsvCell = (cellData: any) => {
            const cell = String(cellData ?? '');
            if (cell.includes(',')) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        };

        const csvRows = [
            headers.join(','),
            ...transactions.map(t => [
                t.id,
                formatCsvCell(t.description),
                t.amount,
                t.type,
                formatCsvCell(t.category),
                t.date,
                formatCsvCell(t.user),
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'transacciones.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isManagingCategories) {
        return (
            <CategoryManager 
                categories={categories}
                addCategory={addCategory}
                deleteCategory={deleteCategory}
                onClose={() => setIsManagingCategories(false)}
            />
        );
    }
    
    if (isManagingUsers) {
        return (
            <UserManager
                users={users}
                addUser={addUser}
                deleteUser={deleteUser}
                onClose={() => setIsManagingUsers(false)}
            />
        );
    }

    return (
        <div className="app-container">
            <header className="header">
                <h1>Gestor de Gastos</h1>
                <div className="header-buttons">
                    <button className="secondary" onClick={() => setIsManagingCategories(true)}>Gestionar Categorías</button>
                    <button className="secondary" onClick={() => setIsManagingUsers(true)}>Gestionar Usuarios</button>
                    <button className="secondary" onClick={exportToCsv}>Exportar a Excel</button>
                </div>
            </header>
            
            <Summary 
                budget={budget}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                remainingBudget={remainingBudget}
            />

            <BudgetManager budget={budget} setBudget={setBudget} />

            <TransactionForm categories={categories} users={users} addTransaction={addTransaction} />

            <TransactionList transactions={transactions} deleteTransaction={deleteTransaction} />
        </div>
    );
};

// Summary Component
interface SummaryProps {
    budget: number;
    totalIncome: number;
    totalExpenses: number;
    remainingBudget: number;
}
const Summary: React.FC<SummaryProps> = ({ budget, totalIncome, totalExpenses, remainingBudget }) => (
    <section className="summary">
        <h2>Resumen Mensual</h2>
        <div className="summary-grid">
            <div className="summary-item">
                <h3>Presupuesto</h3>
                <p className="budget-amount">${budget.toFixed(2)}</p>
            </div>
            <div className="summary-item">
                <h3>Ingresos</h3>
                <p className="income-amount">${totalIncome.toFixed(2)}</p>
            </div>
            <div className="summary-item">
                <h3>Gastos</h3>
                <p className="expense-amount">${totalExpenses.toFixed(2)}</p>
            </div>
            <div className="summary-item">
                <h3>Restante</h3>
                <p className="remaining-amount">${remainingBudget.toFixed(2)}</p>
            </div>
        </div>
    </section>
);


// Budget Manager
interface BudgetManagerProps {
    budget: number;
    setBudget: (value: number) => void;
}
const BudgetManager: React.FC<BudgetManagerProps> = ({ budget, setBudget }) => {
    const [newBudget, setNewBudget] = useState(String(budget));

    const handleUpdate = () => {
        const value = parseFloat(newBudget);
        if (!isNaN(value) && value >= 0) {
            setBudget(value);
        }
    };

    return (
        <section className="form-section">
            <h3>Actualizar Presupuesto</h3>
             <div className="add-item-form">
                <input 
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="Nuevo presupuesto"
                />
                <button onClick={handleUpdate}>Actualizar</button>
            </div>
        </section>
    );
};


// Transaction Form Component
interface TransactionFormProps {
    categories: string[];
    users: string[];
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}
const TransactionForm: React.FC<TransactionFormProps> = ({ categories, users, addTransaction }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'fixed-expense' | 'variable-expense'>('variable-expense');
    const [category, setCategory] = useState(categories[0] || '');
    const [user, setUser] = useState(users[0] || '');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !user) return;
        
        addTransaction({
            description,
            amount: parseFloat(amount),
            type,
            category: type !== 'income' ? category : undefined,
            date,
            user,
        });
        
        setDescription('');
        setAmount('');
    };

    return (
        <section className="form-section">
            <h3>Añadir Nueva Transacción</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="description-field">
                        <label htmlFor="description">Descripción</label>
                        <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="amount">Monto (CAD)</label>
                        <input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="date">Fecha</label>
                        <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                     <div>
                        <label htmlFor="user">Usuario</label>
                        <select id="user" value={user} onChange={e => setUser(e.target.value)} required>
                           {users.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type">Tipo</label>
                        <select id="type" value={type} onChange={e => setType(e.target.value as any)}>
                            <option value="variable-expense">Gasto Variable</option>
                            <option value="fixed-expense">Gasto Fijo</option>
                            <option value="income">Ingreso</option>
                        </select>
                    </div>
                    {type !== 'income' && (
                        <div className="category-field">
                            <label htmlFor="category">Categoría</label>
                            <select id="category" value={category} onChange={e => setCategory(e.target.value)}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <button type="submit">Añadir Transacción</button>
            </form>
        </section>
    );
};

// Transaction List Component
interface TransactionListProps {
    transactions: Transaction[];
    deleteTransaction: (id: string) => void;
}
const TransactionList: React.FC<TransactionListProps> = ({ transactions, deleteTransaction }) => (
    <section className="transaction-list">
        <h2>Transacciones Recientes</h2>
        {transactions.length === 0 ? <p>No hay transacciones todavía.</p> : (
            <div>
                {transactions.map(t => (
                    <div key={t.id} className={`transaction-item ${t.type}`}>
                        <div className="transaction-details">
                            <span className="transaction-description">{t.description}</span>
                            <span className="transaction-category">
                                {t.user}{t.category ? ` - ${t.category}` : ''} - {new Date(t.date).toLocaleDateString()}
                            </span>
                        </div>
                        <span className={`transaction-amount ${t.type === 'income' ? 'income-amount' : 'expense-amount'}`}>
                            {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                        </span>
                        <button className="danger" onClick={() => deleteTransaction(t.id)} style={{marginLeft: '1rem'}}>X</button>
                    </div>
                ))}
            </div>
        )}
    </section>
);

// Category Manager Component
interface CategoryManagerProps {
  categories: string[];
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  onClose: () => void;
}
const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, addCategory, deleteCategory, onClose }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    addCategory(newCategory.trim());
    setNewCategory('');
  };

  return (
    <div className="modal-manager">
      <header className="header">
        <h2>Gestionar Categorías</h2>
        <button onClick={onClose}>Volver</button>
      </header>
      <div className="add-item-form">
          <input 
              type="text" 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nueva categoría"
          />
          <button onClick={handleAdd}>Añadir</button>
      </div>
      <ul className="manager-list">
        {categories.map(c => (
          <li key={c} className="manager-item">
            <span>{c}</span>
            <button className="danger" onClick={() => deleteCategory(c)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// User Manager Component
interface UserManagerProps {
  users: string[];
  addUser: (user: string) => void;
  deleteUser: (user: string) => void;
  onClose: () => void;
}
const UserManager: React.FC<UserManagerProps> = ({ users, addUser, deleteUser, onClose }) => {
  const [newUser, setNewUser] = useState('');

  const handleAdd = () => {
    addUser(newUser.trim());
    setNewUser('');
  };

  return (
    <div className="modal-manager">
      <header className="header">
        <h2>Gestionar Usuarios</h2>
        <button onClick={onClose}>Volver</button>
      </header>
      <div className="add-item-form">
          <input 
              type="text" 
              value={newUser} 
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="Nuevo usuario"
          />
          <button onClick={handleAdd}>Añadir</button>
      </div>
      <ul className="manager-list">
        {users.map(u => (
          <li key={u} className="manager-item">
            <span>{u}</span>
            <button className="danger" onClick={() => deleteUser(u)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};


const root = createRoot(document.getElementById('root')!);
root.render(<App />);