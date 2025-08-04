"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GoalsPage() {
  const [goals, setGoals] = useState([
    {
      id: 1,
      title: 'Fundo de Emergência',
      targetAmount: 10000,
      currentAmount: 6500,
      deadline: '2024-12-31',
      category: 'Segurança',
      status: 'active'
    },
    {
      id: 2,
      title: 'Viagem para Europa',
      targetAmount: 15000,
      currentAmount: 8000,
      deadline: '2025-06-30',
      category: 'Lazer',
      status: 'active'
    },
    {
      id: 3,
      title: 'Entrada do Apartamento',
      targetAmount: 50000,
      currentAmount: 25000,
      deadline: '2026-12-31',
      category: 'Moradia',
      status: 'active'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: ''
  });

  const categories = [
    'Segurança',
    'Lazer',
    'Moradia',
    'Educação',
    'Investimentos',
    'Outros'
  ];

  const handleAddGoal = () => {
    if (newGoal.title && newGoal.targetAmount && newGoal.deadline && newGoal.category) {
      const goal = {
        id: Date.now(),
        title: newGoal.title,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: parseFloat(newGoal.currentAmount || '0'),
        deadline: newGoal.deadline,
        category: newGoal.category,
        status: 'active'
      };
      setGoals([goal, ...goals]);
      setNewGoal({ title: '', targetAmount: '', currentAmount: '', deadline: '', category: '' });
      setShowAddForm(false);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metas Financeiras</h1>
          <p className="text-gray-600 mt-1">Defina e acompanhe suas metas financeiras</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-stone-800 hover:bg-stone-900"
        >
          + Nova Meta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-blue-600">R$ 39.500,00</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Meta Total</p>
              <p className="text-2xl font-bold text-green-600">R$ 75.000,00</p>
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
              <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
              <p className="text-2xl font-bold text-purple-600">52.7%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Meta</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="title">Título da Meta</Label>
              <Input
                id="title"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                placeholder="Ex: Fundo de Emergência"
              />
            </div>
            <div>
              <Label htmlFor="targetAmount">Valor Alvo</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="currentAmount">Valor Atual</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                value={newGoal.currentAmount}
                onChange={(e) => setNewGoal({...newGoal, currentAmount: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={newGoal.category} onValueChange={(value) => setNewGoal({...newGoal, category: value})}>
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
              <Label htmlFor="deadline">Prazo</Label>
              <Input
                id="deadline"
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <Button onClick={handleAddGoal} className="bg-stone-800 hover:bg-stone-900">
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

      {/* Goals List */}
      <div className="space-y-6">
        {goals.map((goal) => {
          const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
          const daysLeft = getDaysUntilDeadline(goal.deadline);
          
          return (
            <div key={goal.id} className="bg-white rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {goal.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      R$ {goal.currentAmount.toLocaleString('pt-BR')} de R$ {goal.targetAmount.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{progress.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">
                      {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo expirado'}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                {/* Goal Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Valor Restante</p>
                    <p className="font-semibold text-gray-900">
                      R$ {(goal.targetAmount - goal.currentAmount).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Prazo</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className={`font-semibold ${daysLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {daysLeft > 0 ? 'Em andamento' : 'Atrasado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 