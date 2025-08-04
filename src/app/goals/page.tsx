"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart3 } from "lucide-react"
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

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([
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
    }
  ]);

  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target: '',
    deadline: '',
    category: 'savings'
  });

  const addGoal = () => {
    if (!newGoal.name || !newGoal.target || !newGoal.deadline) return;

    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoal.name,
      target: parseFloat(newGoal.target),
      current: 0,
      deadline: newGoal.deadline,
      category: newGoal.category
    };

    setGoals([...goals, goal]);
    setNewGoal({ name: '', target: '', deadline: '', category: 'savings' });
    setShowNewGoal(false);
  };

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
        <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header Section */}
          <motion.div variants={item} className="mb-12">
            <h1 className="text-6xl font-bold text-slate-700 mb-4">Metas</h1>
            <p className="text-xl text-slate-600">Defina e acompanhe suas metas financeiras</p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Metas - 2/3 da largura */}
            <motion.div variants={item} className="xl:col-span-2">
              <Card className="border-slate-200 shadow-sm bg-white/80 backdrop-blur-xl h-fit">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-slate-700">Suas Metas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {goals.map((goal) => (
                      <div key={goal.id} className="border border-slate-200 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-700">{goal.name}</h3>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getCategoryColor(goal.category)}`}>
                              {goal.category === 'emergency' ? 'Emergência' : 
                               goal.category === 'travel' ? 'Viagem' : 
                               goal.category === 'investment' ? 'Investimento' : 'Poupança'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-700">
                              R$ {goal.current.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-500">
                              de R$ {goal.target.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Progresso</span>
                            <span className="font-medium text-slate-700">{getProgressPercentage(goal.current, goal.target).toFixed(1)}%</span>
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

            {/* Sidebar - 1/3 da largura */}
            <motion.div variants={item} className="space-y-6">
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
                      <h4 className="font-medium text-slate-800 mb-2">🎯 Meta Recomendada</h4>
                      <p className="text-slate-600 text-sm">
                        Baseado no seu perfil, sugiro criar uma reserva de emergência de 6 meses de gastos fixos.
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-2">📈 Estratégia de Poupança</h4>
                      <p className="text-slate-600 text-sm">
                        Para atingir suas metas mais rápido, considere automatizar transferências mensais.
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-2">💡 Dicas Importantes</h4>
                      <ul className="text-slate-600 text-sm space-y-1">
                        <li>• Priorize metas de emergência antes de investir</li>
                        <li>• Revise suas metas mensalmente</li>
                        <li>• Celebre pequenas conquistas</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

        {/* New Goal Modal */}
        {showNewGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Nova Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="goal-name">Nome da Meta</Label>
                  <Input
                    id="goal-name"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                    placeholder="Ex: Reserva de Emergência"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-target">Valor Alvo (R$)</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({...newGoal, target: e.target.value})}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-deadline">Data Limite</Label>
                  <Input
                    id="goal-deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addGoal} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    Criar Meta
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewGoal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
    </>
  )
} 