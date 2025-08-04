"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BillsPage() {
  const [bills, setBills] = useState([
    {
      id: 1,
      name: 'Conta de Luz',
      amount: 120.00,
      dueDate: '2024-01-25',
      category: 'Moradia',
      status: 'pending',
      recurring: true,
      frequency: 'monthly'
    },
    {
      id: 2,
      name: 'Internet',
      amount: 89.90,
      dueDate: '2024-01-20',
      category: 'Serviços',
      status: 'paid',
      recurring: true,
      frequency: 'monthly'
    },
    {
      id: 3,
      name: 'Seguro do Carro',
      amount: 250.00,
      dueDate: '2024-02-15',
      category: 'Transporte',
      status: 'pending',
      recurring: true,
      frequency: 'monthly'
    },
    {
      id: 4,
      name: 'Netflix',
      amount: 39.90,
      dueDate: '2024-01-18',
      category: 'Entretenimento',
      status: 'paid',
      recurring: true,
      frequency: 'monthly'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    dueDate: '',
    category: '',
    recurring: true,
    frequency: 'monthly'
  });

  const categories = [
    'Moradia',
    'Serviços',
    'Transporte',
    'Saúde',
    'Entretenimento',
    'Educação',
    'Outros'
  ];

  const frequencies = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' }
  ];

  const handleAddBill = () => {
    if (newBill.name && newBill.amount && newBill.dueDate && newBill.category) {
      const bill = {
        id: Date.now(),
        name: newBill.name,
        amount: parseFloat(newBill.amount),
        dueDate: newBill.dueDate,
        category: newBill.category,
        status: 'pending',
        recurring: newBill.recurring,
        frequency: newBill.frequency
      };
      setBills([bill, ...bills]);
      setNewBill({ name: '', amount: '', dueDate: '', category: '', recurring: true, frequency: 'monthly' });
      setShowAddForm(false);
    }
  };

  const handleMarkAsPaid = (id: number) => {
    setBills(bills.map(bill => 
      bill.id === id ? { ...bill, status: 'paid' } : bill
    ));
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidBills = bills.filter(bill => bill.status === 'paid');
  const pendingBills = bills.filter(bill => bill.status === 'pending');
  const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas contas recorrentes e pagamentos</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-stone-800 hover:bg-stone-900"
        >
          + Nova Conta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Contas</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalBills.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pagas</p>
              <p className="text-2xl font-bold text-green-600">R$ {totalPaid.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-red-600">R$ {totalPending.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Próximo Vencimento</p>
              <p className="text-2xl font-bold text-orange-600">3 dias</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add Bill Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Conta</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Nome da Conta</Label>
              <Input
                id="name"
                value={newBill.name}
                onChange={(e) => setNewBill({...newBill, name: e.target.value})}
                placeholder="Ex: Conta de Luz"
              />
            </div>
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newBill.amount}
                onChange={(e) => setNewBill({...newBill, amount: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={newBill.category} onValueChange={(value) => setNewBill({...newBill, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={newBill.dueDate}
                onChange={(e) => setNewBill({...newBill, dueDate: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="frequency">Frequência</Label>
              <Select value={newBill.frequency} onValueChange={(value) => setNewBill({...newBill, frequency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="recurring"
                checked={newBill.recurring}
                onChange={(e) => setNewBill({...newBill, recurring: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="recurring">Conta Recorrente</Label>
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <Button onClick={handleAddBill} className="bg-stone-800 hover:bg-stone-900">
              Adicionar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowAddForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Suas Contas</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {bills.map((bill) => {
              const daysUntilDue = getDaysUntilDue(bill.dueDate);
              const isOverdue = daysUntilDue < 0;
              const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;
              
              return (
                <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      bill.status === 'paid' ? 'bg-green-100' : 
                      isOverdue ? 'bg-red-100' : 
                      isDueSoon ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        bill.status === 'paid' ? 'text-green-600' : 
                        isOverdue ? 'text-red-600' : 
                        isDueSoon ? 'text-orange-600' : 'text-blue-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{bill.name}</p>
                        {bill.recurring && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            Recorrente
                          </span>
                        )}
                        {bill.status === 'paid' && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Paga
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {bill.category} • Vence em {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                        {isOverdue && <span className="text-red-600 ml-2">(Atrasada)</span>}
                        {isDueSoon && <span className="text-orange-600 ml-2">(Vence em breve)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">R$ {bill.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {daysUntilDue > 0 ? `${daysUntilDue} dias restantes` : 
                         daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} dias atrasada` : 
                         'Vence hoje'}
                      </p>
                    </div>
                    {bill.status === 'pending' && (
                      <Button 
                        onClick={() => handleMarkAsPaid(bill.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Marcar como Paga
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 