import { motion } from 'framer-motion';
import { Wallet, Brain, MessageSquare, TrendingUp } from 'lucide-react';

export function BenefitsSection() {
  const benefits = [
    {
      icon: <Wallet className="w-6 h-6" />,
      title: 'Smart Expense Tracking',
      description: 'Automatically categorize your expenses and get detailed insights into your spending habits.',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI Financial Assistant',
      description: 'Get personalized financial advice and recommendations based on your spending patterns.',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'WhatsApp Notifications',
      description: 'Receive instant updates about your expenses, savings goals, and financial insights via WhatsApp.',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Smart Analytics',
      description: 'View detailed reports and analytics to understand your financial health better.',
    },
  ];

  return (
    <div className="mt-40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-green-50 opacity-50"></div>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why choose <span className="text-emerald-600">us?</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Everything you need to know about Caishen - Track your money
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-8 sm:grid-cols-2"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 * index }}
              className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors duration-200"
            >
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                {benefit.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-500">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
} 