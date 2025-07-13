"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Target } from "lucide-react"
import { motion } from "framer-motion"

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

export default function AnalyticsPage() {
  return (
    <motion.div 
      className="min-h-screen bg-transparent pt-8"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl font-bold text-orange-800 mb-2">Analytics Financeiro</h1>
          <p className="text-orange-600">Insights e relatórios sobre suas finanças com recomendações da IA</p>
        </motion.div>

        {/* Overview Cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Renda Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">R$ 8,500</div>
              <p className="text-xs text-green-600">+12% vs mês anterior</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Gastos Totais</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">R$ 3,200</div>
              <p className="text-xs text-red-600">-8% vs mês anterior</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Poupança</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">R$ 5,300</div>
              <p className="text-xs text-orange-600">62% da renda</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Score IA</CardTitle>
              <Target className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">85/100</div>
              <p className="text-xs text-orange-600">Excelente progresso</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expense Breakdown */}
          <motion.div variants={item}>
            <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-orange-600" />
                  Distribuição de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Moradia</span>
                    <span className="text-sm font-medium">40% - R$ 1,280</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Alimentação</span>
                    <span className="text-sm font-medium">25% - R$ 800</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Transporte</span>
                    <span className="text-sm font-medium">20% - R$ 640</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lazer</span>
                    <span className="text-sm font-medium">15% - R$ 480</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Insights */}
          <motion.div variants={item}>
            <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-orange-600" />
                  Insights da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2">✅ Pontos Positivos</h4>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>• Sua poupança está acima da média (62% vs 20% recomendado)</li>
                      <li>• Redução de 8% nos gastos este mês</li>
                      <li>• Boa distribuição seguindo a regra 50/30/20</li>
                    </ul>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2">⚠️ Oportunidades</h4>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>• Considere investir parte da poupança em renda fixa</li>
                      <li>• Gastos com lazer podem ser otimizados</li>
                      <li>• Automatize transferências para metas</li>
                    </ul>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2">🎯 Próximos Passos</h4>
                    <ul className="text-orange-700 text-sm space-y-1">
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

        {/* Monthly Trend */}
        <motion.div variants={item} className="mt-8">
          <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-orange-600" />
                Tendência dos Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {[6, 5, 4, 3, 2, 1].map((month) => (
                  <div key={month} className="text-center">
                    <div className="text-sm text-gray-600 mb-2">
                      {month === 1 ? 'Atual' : `${month} meses atrás`}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-green-600">R$ {(8500 - month * 200).toLocaleString()}</div>
                      <div className="text-xs text-red-600">R$ {(3200 - month * 50).toLocaleString()}</div>
                      <div className="text-xs text-blue-600">R$ {(5300 - month * 150).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-xs text-gray-500">
                <span>🟢 Renda</span>
                <span>🔴 Gastos</span>
                <span>🔵 Poupança</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
} 