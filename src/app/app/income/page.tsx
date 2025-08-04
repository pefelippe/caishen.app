"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function IncomePage() {
  const [income, setIncome] = useState([
    {
      id: 1,
      description: 'Salário',
      amount: 3500.00,
      category: 'Trabalho',
      date: '2024-01-15',
      type: 'income'
    },
    {
      id: 2,
      description: 'Freelance',
      amount: 800.00,
      category: 'Trabalho',
      date: '2024-01-14',
      type: 'income'
    },
    {
      id: 3,
      description: 'Investimentos',
      amount: 150.00,
      category: 'Investimentos',
      date: '2024-01-13',
      type: 'income'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newIncome, setNewIncome] = useState({
    description: '',
    amount: '',
    category: '',
    date: ''
  });

  const categories = [
    'Trabalho',
    'Freelance',
    'Investimentos',
    'Vendas',
    'Presentes',
    'Outros'
  ];

  const handleAddIncome = () => {
    if (newIncome.description && newIncome.amount && newIncome.category && newIncome.date) {
      const incomeItem = {
        id: Date.now(),
        description: newIncome.description,
        amount: parseFloat(newIncome.amount),
        category: newIncome.category,
        date: newIncome.date,
        type: 'income'
      };
      setIncome([incomeItem, ...income]);
      setNewIncome({ description: '', amount: '', category: '', date: '' });
      setShowAddForm(false);
    }
  };

  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receitas</h1>
          <p className="text-gray-600 mt-1">Acompanhe suas receitas e fontes de renda</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-stone-800 hover:bg-stone-900"
        >
          + Nova Receita
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total do Mês</p>
              <p className="text-2xl font-bold text-green-600">R$ {totalIncome.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Média Diária</p>
              <p className="text-2xl font-bold text-gray-900">R$ {(totalIncome / 30).toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fonte Principal</p>
              <p className="text-2xl font-bold text-gray-900">Trabalho</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add Income Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Receita</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={newIncome.description}
                onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                placeholder="Ex: Salário"
              />
            </div>
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newIncome.amount}
                onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={newIncome.category} onValueChange={(value) => setNewIncome({...newIncome, category: value})}>
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newIncome.date}
                onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <Button onClick={handleAddIncome} className="bg-stone-800 hover:bg-stone-900">
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

      {/* Income List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Receitas Recentes</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {income.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <p className="text-sm text-gray-500">{item.category} • {new Date(item.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+R$ {item.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 