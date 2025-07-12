"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrendingUp, TrendingDown, DollarSign, Target, Plus, Target as TargetIcon, DollarSign as DollarSignIcon, BarChart3, PieChart, ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import Footer from "@/components/Footer"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
}

interface Expense {
  id: string;
  name: string;
  value: number;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringUntil?: string;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-800 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Dados de exemplo para gastos
  const expenses: Expense[] = [
    { id: '1', name: 'Aluguel', value: 1200, category: 'Moradia', date: '2024-01-15', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '2', name: 'Conta de Luz', value: 150, category: 'Moradia', date: '2024-01-20', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '3', name: 'Supermercado', value: 450, category: 'Alimentação', date: '2024-01-18', isRecurring: false },
    { id: '4', name: 'Uber', value: 25, category: 'Transporte', date: '2024-01-22', isRecurring: false },
    { id: '5', name: 'Netflix', value: 39.90, category: 'Entretenimento', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '6', name: 'Academia', value: 89.90, category: 'Saúde', date: '2024-01-05', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '7', name: 'Restaurante', value: 120, category: 'Alimentação', date: '2024-01-25', isRecurring: false },
    { id: '8', name: 'Combustível', value: 200, category: 'Transporte', date: '2024-01-10', isRecurring: false },
    { id: '9', name: 'Conta de Água', value: 80, category: 'Moradia', date: '2024-01-12', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '10', name: 'Spotify', value: 19.90, category: 'Entretenimento', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '11', name: 'Farmácia', value: 75, category: 'Saúde', date: '2024-01-28', isRecurring: false },
    { id: '12', name: 'Cinema', value: 60, category: 'Entretenimento', date: '2024-01-30', isRecurring: false },
    { id: '13', name: 'Estacionamento', value: 15, category: 'Transporte', date: '2024-01-15', isRecurring: false },
    { id: '14', name: 'Lavanderia', value: 45, category: 'Serviços', date: '2024-01-20', isRecurring: false },
    { id: '15', name: 'Seguro do Carro', value: 300, category: 'Transporte', date: '2024-01-05', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '16', name: 'Internet', value: 99.90, category: 'Moradia', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '17', name: 'Café da Manhã', value: 35, category: 'Alimentação', date: '2024-01-29', isRecurring: false },
    { id: '18', name: 'Consulta Médica', value: 150, category: 'Saúde', date: '2024-01-25', isRecurring: false },
    { id: '19', name: 'Presente', value: 120, category: 'Outros', date: '2024-01-30', isRecurring: false },
    { id: '20', name: 'Manutenção Carro', value: 400, category: 'Transporte', date: '2024-01-10', isRecurring: false },
    { id: '21', name: 'IPTU', value: 800, category: 'Moradia', date: '2024-01-15', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '22', name: 'IPTU', value: 800, category: 'Moradia', date: '2024-01-15', isRecurring: true, recurringUntil: '2024-12-31' },
  ];

  // Dados de exemplo para metas
  const goals: Goal[] = [
    {
      id: '1',
      name: 'Reserva de Emergência',
      target: 10000,
      current: 3500,
      deadline: '2024-12-31',
      category: 'emergency'
    },
    {
      id: '2',
      name: 'Viagem para Europa',
      target: 15000,
      current: 8000,
      deadline: '2025-06-30',
      category: 'travel'
    },
    {
      id: '3',
      name: 'Entrada do Apartamento',
      target: 50000,
      current: 12000,
      deadline: '2025-12-31',
      category: 'investment'
    },
    {
      id: '4',
      name: 'Reserva de Emergência',
      target: 10000,
      current: 3500,
      deadline: '2024-12-31',
      category: 'emergency'
    }
  ];

  const itemsPerPage = 10;
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpenses = expenses.slice(startIndex, endIndex);
  
  // Create array with exactly 10 items, filling with empty placeholders if needed
  const displayExpenses = Array.from({ length: 10 }, (_, index) => {
    if (index < currentExpenses.length) {
      return currentExpenses[index];
    } else {
      return {
        id: `empty-${index}`,
        name: '',
        value: 0,
        category: '',
        date: '',
        isRecurring: false
      };
    }
  });

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'travel': return 'bg-blue-100 text-blue-800';
      case 'investment': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  return (
    <>
      <motion.div 
        className="min-h-screen bg-transparent pt-8"
        initial="hidden"
        animate="show"
        variants={container}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          {/* Header Section */}
          <motion.div variants={item} className="mb-8 sm:mb-16 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-6xl lg:text-8xl xl:text-9xl font-black text-slate-800 mb-4 sm:mb-6 leading-tight">Olá, {user?.displayName || "Usuário"} 👋.</h1>
            </div>
          </motion.div>

          {/* Analytics Section */}
          <motion.div variants={item} className="mt-16 sm:mt-24 lg:mt-32 mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 mb-2 sm:mb-4">Seus Analytics</h2>
            <p className="text-lg sm:text-xl text-slate-600 font-medium">Análises detalhadas das suas finanças</p>
          </motion.div>

          <motion.div variants={item}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {/* Resumo Financeiro - Renda */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-100 to-emerald-200 p-6">
                  <CardTitle className="text-lg font-bold text-emerald-800 flex items-center">
                    <div className="p-2 bg-emerald-500 rounded-full mr-3">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    Renda Total
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-emerald-700 mb-2">R$ 8,500</div>
                    <div className="text-sm text-emerald-600 font-medium">Este mês</div>
                    <div className="mt-3 flex items-center justify-center text-emerald-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">+12% vs mês anterior</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo Financeiro - Gastos */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-100 to-red-200 p-6">
                  <CardTitle className="text-lg font-bold text-red-800 flex items-center">
                    <div className="p-2 bg-red-500 rounded-full mr-3">
                      <TrendingDown className="h-5 w-5 text-white" />
                    </div>
                    Gastos Totais
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-red-700 mb-2">R$ 3,200</div>
                    <div className="text-sm text-red-600 font-medium">Este mês</div>
                    <div className="mt-3 flex items-center justify-center text-red-600">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">-8% vs mês anterior</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo Financeiro - Poupança */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-200 p-6">
                  <CardTitle className="text-lg font-bold text-blue-800 flex items-center">
                    <div className="p-2 bg-blue-500 rounded-full mr-3">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    Poupança
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-blue-700 mb-2">R$ 5,300</div>
                    <div className="text-sm text-blue-600 font-medium">Este mês</div>
                    <div className="mt-3 flex items-center justify-center text-blue-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">+62% da renda</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score IA */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-violet-100 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-100 to-violet-200 p-6">
                  <CardTitle className="text-lg font-bold text-violet-800 flex items-center">
                    <div className="p-2 bg-violet-500 rounded-full mr-3">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    Score IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-violet-700 mb-2">85/100</div>
                    <div className="text-sm text-violet-600 font-medium">Excelente</div>
                    <div className="mt-3 w-full bg-violet-200 rounded-full h-2">
                      <div className="bg-violet-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Distribuição de Gastos Section */}
          <motion.div variants={item} className="mt-12 sm:mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Distribuição de Gastos */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 p-6">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center">
                    <div className="p-2 bg-slate-500 rounded-full mr-3">
                      <PieChart className="h-5 w-5 text-white" />
                    </div>
                    Distribuição de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-600 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-slate-700">Moradia</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">R$ 1,280</div>
                        <div className="text-xs text-slate-500">40% do total</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: '40%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-600 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-slate-700">Alimentação</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">R$ 800</div>
                        <div className="text-xs text-slate-500">25% do total</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-green-600 h-3 rounded-full transition-all duration-300" style={{ width: '25%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-amber-600 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-slate-700">Transporte</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">R$ 640</div>
                        <div className="text-xs text-slate-500">20% do total</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-amber-600 h-3 rounded-full transition-all duration-300" style={{ width: '20%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-purple-600 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-slate-700">Lazer</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">R$ 480</div>
                        <div className="text-xs text-slate-500">15% do total</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-purple-600 h-3 rounded-full transition-all duration-300" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insights da IA */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-violet-100 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-100 to-violet-200 p-6">
                  <CardTitle className="text-xl font-bold text-violet-800 flex items-center">
                    <div className="p-2 bg-violet-500 rounded-full mr-3">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    Insights da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="bg-white/80 p-4 rounded-xl border-l-4 border-emerald-500">
                      <h4 className="font-bold text-emerald-800 mb-2 text-sm flex items-center">
                        <span className="mr-2">✅</span>
                        Pontos Positivos
                      </h4>
                      <p className="text-emerald-700 text-sm">Sua poupança está acima da média (62% vs 20% recomendado)</p>
                    </div>
                    <div className="bg-white/80 p-4 rounded-xl border-l-4 border-amber-500">
                      <h4 className="font-bold text-amber-800 mb-2 text-sm flex items-center">
                        <span className="mr-2">⚠️</span>
                        Oportunidades
                      </h4>
                      <p className="text-amber-700 text-sm">Considere investir parte da poupança em renda fixa</p>
                    </div>
                    <div className="bg-white/80 p-4 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center">
                        <span className="mr-2">🎯</span>
                        Próximos Passos
                      </h4>
                      <p className="text-blue-700 text-sm">Criar reserva de emergência de 6 meses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Metas Section */}
          <motion.div variants={item} className="mt-16 sm:mt-24 lg:mt-32 mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 mb-2 sm:mb-4">Suas Metas</h2>
            <p className="text-lg sm:text-xl text-slate-600 font-medium">Acompanhe o progresso das suas metas financeiras</p>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-200 p-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-blue-800 flex items-center">
                    <div className="p-3 bg-blue-500 rounded-full mr-4">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    Suas Metas Financeiras
                  </CardTitle>
                                      <Button 
                      variant="outline" 
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100 font-medium cursor-pointer"
                    >
                      Ver Todas as Metas
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  {goals.map((goal) => (
                    <div key={goal.id} className="bg-white/80 p-6 rounded-2xl border-0 shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-700 mb-2">{goal.name}</h4>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(goal.category)}`}>
                            {goal.category === 'emergency' ? 'Emergência' : 
                             goal.category === 'travel' ? 'Viagem' : 
                             goal.category === 'investment' ? 'Investimento' : 'Poupança'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-700">
                            R$ {goal.current.toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-500">
                            de R$ {goal.target.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 font-medium">Progresso</span>
                          <span className="font-bold text-slate-700">{getProgressPercentage(goal.current, goal.target).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(goal.current, goal.target)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>Meta: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                          <span>Faltam: R$ {(goal.target - goal.current).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gastos Section */}
          <motion.div variants={item} className="mt-16 sm:mt-24 lg:mt-32 mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 mb-2 sm:mb-4">Seus Gastos</h2>
            <p className="text-lg sm:text-xl text-slate-600 font-medium">Gerencie seus gastos e acompanhe suas despesas</p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8">
            {/* Gastos - Full width */}
            <motion.div variants={item} className="col-span-1">
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-xl h-full rounded-3xl overflow-hidden flex flex-col">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">
                      Gastos do mês de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                      Ver Todos os Gastos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-white/95 backdrop-blur-sm">
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Nome</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Valor</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Categoria</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Data</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Recorrente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayExpenses.map((expense, index) => (
                            <tr key={expense.id} className={`border-b border-slate-100 transition-colors duration-150 ${
                              expense.name ? 'hover:bg-slate-50' : 'bg-slate-50/30'
                            }`}>
                              <td className="py-4 px-6 text-sm text-slate-700 font-medium">
                                {expense.name || <span className="text-slate-300 italic">—</span>}
                              </td>
                              <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                                {expense.value > 0 ? `R$ ${expense.value.toLocaleString()}` : <span className="text-slate-300 italic">—</span>}
                              </td>
                              <td className="py-4 px-6 text-sm text-slate-600">
                                {expense.category || <span className="text-slate-300 italic">—</span>}
                              </td>
                              <td className="py-4 px-6 text-sm text-slate-600">
                                {expense.date ? new Date(expense.date).toLocaleDateString('pt-BR') : <span className="text-slate-300 italic">—</span>}
                              </td>
                              <td className="py-4 px-6 text-sm">
                                {expense.name ? (
                                  expense.isRecurring ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 font-bold">✓</span>
                                      <span className="text-xs text-slate-500">Até {new Date(expense.recurringUntil!).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )
                                ) : (
                                  <span className="text-slate-300 italic">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50/50 flex-shrink-0">
                      <div className="text-sm text-slate-600 font-medium">
                        Mostrando {startIndex + 1}-{Math.min(endIndex, expenses.length)} de {expenses.length} gastos
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 px-3 font-medium">
                          {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Insights Section */}
          <motion.div variants={item} className="mt-16 sm:mt-24 lg:mt-32 mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 mb-2 sm:mb-4">Seus Insights</h2>
            <p className="text-lg sm:text-xl text-slate-600 font-medium">Análises e recomendações da IA para suas finanças</p>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-violet-100 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-100 to-violet-200 p-8">
                <CardTitle className="text-2xl font-bold text-violet-800 flex items-center">
                  <div className="p-3 bg-violet-500 rounded-full mr-4">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  Seus Insights da IA
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  <div className="bg-white/80 p-4 sm:p-6 lg:p-8 rounded-2xl border-0 shadow-lg">
                    <h4 className="font-bold text-violet-800 mb-2 sm:mb-4 text-lg sm:text-xl">✅ Pontos Positivos</h4>
                    <ul className="text-violet-700 text-sm sm:text-base space-y-2 sm:space-y-3 font-medium">
                      <li>• Sua poupança está acima da média (62% vs 20% recomendado)</li>
                      <li>• Redução de 8% nos gastos este mês</li>
                      <li>• Boa distribuição seguindo a regra 50/30/20</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/80 p-4 sm:p-6 lg:p-8 rounded-2xl border-0 shadow-lg">
                    <h4 className="font-bold text-violet-800 mb-2 sm:mb-4 text-lg sm:text-xl">⚠️ Oportunidades</h4>
                    <ul className="text-violet-700 text-sm sm:text-base space-y-2 sm:space-y-3 font-medium">
                      <li>• Considere investir parte da poupança em renda fixa</li>
                      <li>• Gastos com lazer podem ser otimizados</li>
                      <li>• Automatize transferências para metas</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/80 p-4 sm:p-6 lg:p-8 rounded-2xl border-0 shadow-lg">
                    <h4 className="font-bold text-violet-800 mb-2 sm:mb-4 text-lg sm:text-xl">🎯 Próximos Passos</h4>
                    <ul className="text-violet-700 text-sm sm:text-base space-y-2 sm:space-y-3 font-medium">
                      <li>• Criar reserva de emergência de 6 meses</li>
                      <li>• Diversificar investimentos</li>
                      <li>• Revisar gastos com transporte</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Footer */}
      <Footer />
    </>
  )
} 