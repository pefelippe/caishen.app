"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign, ShoppingBag, Save } from "lucide-react"
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

export default function ProfilePage() {
  const [financialData, setFinancialData] = useState({
    income: '',
    rent: '',
    utilities: '',
    groceries: '',
    transportation: '',
    entertainment: '',
    savings: ''
  })

  const handleSave = () => {

    console.log('Saving financial data:', financialData)
  }

  return (
    <motion.div 
      className="min-h-screen bg-transparent pt-8"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl font-bold text-orange-800 mb-2">Perfil Financeiro</h1>
          <p className="text-orange-600">Configure seus dados financeiros para receber sugestões personalizadas da IA</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Renda e Gastos Fixos */}
          <motion.div variants={item}>
            <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-orange-600" />
                  Renda e Gastos Fixos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="income" className="text-orange-700">Renda Mensal</Label>
                  <Input
                    id="income"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.income}
                    onChange={(e) => setFinancialData({...financialData, income: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
                <div>
                  <Label htmlFor="rent" className="text-orange-700">Aluguel/Moradia</Label>
                  <Input
                    id="rent"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.rent}
                    onChange={(e) => setFinancialData({...financialData, rent: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
                <div>
                  <Label htmlFor="utilities" className="text-orange-700">Contas (Luz, Água, etc.)</Label>
                  <Input
                    id="utilities"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.utilities}
                    onChange={(e) => setFinancialData({...financialData, utilities: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gastos Variáveis */}
          <motion.div variants={item}>
            <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5 text-orange-600" />
                  Gastos Variáveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="groceries" className="text-orange-700">Alimentação</Label>
                  <Input
                    id="groceries"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.groceries}
                    onChange={(e) => setFinancialData({...financialData, groceries: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
                <div>
                  <Label htmlFor="transportation" className="text-orange-700">Transporte</Label>
                  <Input
                    id="transportation"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.transportation}
                    onChange={(e) => setFinancialData({...financialData, transportation: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
                <div>
                  <Label htmlFor="entertainment" className="text-orange-700">Lazer e Entretenimento</Label>
                  <Input
                    id="entertainment"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.entertainment}
                    onChange={(e) => setFinancialData({...financialData, entertainment: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Metas de Poupança */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="border-orange-200 shadow-sm bg-yellow-50/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
                  <Save className="mr-2 h-5 w-5 text-orange-600" />
                  Metas de Poupança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="savings" className="text-orange-700">Meta Mensal de Poupança</Label>
                  <Input
                    id="savings"
                    type="number"
                    placeholder="R$ 0,00"
                    value={financialData.savings}
                    onChange={(e) => setFinancialData({...financialData, savings: e.target.value})}
                    className="mt-1 border-orange-200 focus:border-orange-400"
                  />
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-900 mb-2">💡 Dica da IA</h4>
                  <p className="text-orange-700 text-sm">
                    A regra 50/30/20 sugere: 50% para necessidades, 30% para desejos e 20% para poupança. 
                    Configure seus dados para receber sugestões personalizadas!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={item} className="mt-8 flex justify-end">
          <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
            Salvar Dados
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
} 