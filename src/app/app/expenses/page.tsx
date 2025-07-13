"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, PieChart, ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"

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

export default function ExpensesPage() {
  const [currentPage, setCurrentPage] = useState(1);

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
    { id: '9', name: 'Internet', value: 99.90, category: 'Moradia', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '10', name: 'Cinema', value: 60, category: 'Entretenimento', date: '2024-01-28', isRecurring: false },
    { id: '11', name: 'Farmácia', value: 85, category: 'Saúde', date: '2024-01-12', isRecurring: false },
    { id: '12', name: 'Shopping', value: 300, category: 'Vestuário', date: '2024-01-30', isRecurring: false },
    { id: '13', name: 'Spotify', value: 19.90, category: 'Entretenimento', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '14', name: 'Delivery', value: 45, category: 'Alimentação', date: '2024-01-26', isRecurring: false },
    { id: '15', name: 'Estacionamento', value: 15, category: 'Transporte', date: '2024-01-23', isRecurring: false },
    { id: '16', name: 'Seguro Carro', value: 350, category: 'Transporte', date: '2024-01-05', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '17', name: 'Livros', value: 120, category: 'Educação', date: '2024-01-15', isRecurring: false },
    { id: '18', name: 'Corte de Cabelo', value: 50, category: 'Cuidados Pessoais', date: '2024-01-20', isRecurring: false },
    { id: '19', name: 'Presente', value: 200, category: 'Outros', date: '2024-01-27', isRecurring: false },
    { id: '20', name: 'Manutenção Carro', value: 500, category: 'Transporte', date: '2024-01-08', isRecurring: false },
    { id: '21', name: 'Viagem', value: 1500, category: 'Lazer', date: '2024-01-30', isRecurring: false },
    { id: '22', name: 'Assinatura Revista', value: 29.90, category: 'Educação', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
  ];

  const itemsPerPage = 8;
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpenses = expenses.slice(startIndex, endIndex);

  return (
    <>
      <motion.div 
        className="min-h-screen bg-transparent pt-8"
        initial="hidden"
        animate="show"
        variants={container}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header Section */}
          <motion.div variants={item} className="mb-12">
            <h1 className="text-6xl font-bold text-slate-700 mb-4">Gastos</h1>
            <p className="text-xl text-slate-600">Gerencie seus gastos e acompanhe suas despesas</p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Tabela de Gastos - 2/3 da largura */}
            <motion.div variants={item} className="xl:col-span-2">
              <Card className="border-slate-200 shadow-sm bg-white/80 backdrop-blur-xl h-fit">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-slate-700">Gastos do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Nome</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Valor</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Categoria</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Data</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Recorrente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentExpenses.map((expense) => (
                          <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-700">{expense.name}</td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-700">R$ {expense.value.toLocaleString()}</td>
                            <td className="py-3 px-4 text-sm text-slate-600">{expense.category}</td>
                            <td className="py-3 px-4 text-sm text-slate-600">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 px-4 text-sm">
                              {expense.isRecurring ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600">✓</span>
                                  <span className="text-xs text-slate-500">Até {new Date(expense.recurringUntil!).toLocaleDateString('pt-BR')}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-slate-600">
                        Mostrando {startIndex + 1}-{Math.min(endIndex, expenses.length)} de {expenses.length} gastos
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="border-slate-200 text-slate-600"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 px-3">
                          {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="border-slate-200 text-slate-600"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Sidebar - 1/3 da largura */}
            <motion.div variants={item} className="space-y-6">
              {/* Distribuição de Gastos */}
              <Card className="border-slate-200 shadow-sm bg-white/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center">
                    <PieChart className="mr-2 h-5 w-5 text-slate-600" />
                    Distribuição de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Moradia</span>
                      <span className="text-sm font-medium">40% - R$ 1,280</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Alimentação</span>
                      <span className="text-sm font-medium">25% - R$ 800</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Transporte</span>
                      <span className="text-sm font-medium">20% - R$ 640</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-amber-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Lazer</span>
                      <span className="text-sm font-medium">15% - R$ 480</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insights da IA */}
              <Card className="border-slate-200 shadow-sm bg-white/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-slate-600" />
                    Insights da IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-2">✅ Pontos Positivos</h4>
                      <ul className="text-slate-600 text-sm space-y-1">
                        <li>• Sua poupança está acima da média (62% vs 20% recomendado)</li>
                        <li>• Redução de 8% nos gastos este mês</li>
                        <li>• Boa distribuição seguindo a regra 50/30/20</li>
                      </ul>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-2">⚠️ Oportunidades</h4>
                      <ul className="text-slate-600 text-sm space-y-1">
                        <li>• Considere investir parte da poupança em renda fixa</li>
                        <li>• Gastos com lazer podem ser otimizados</li>
                        <li>• Automatize transferências para metas</li>
                      </ul>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-2">🎯 Próximos Passos</h4>
                      <ul className="text-slate-600 text-sm space-y-1">
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
        </div>
      </motion.div>
    </>
  )
} 