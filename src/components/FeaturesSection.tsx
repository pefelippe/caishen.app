'use client';

import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Shield, 
  BarChart3, 
  Globe,
  CreditCard,
  TrendingUp
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Integration"
  },
  {
    icon: Globe,
    title: "WhatsApp Integration"
  },
  {
    icon: Shield,
    title: "Bank-Level Security"
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics"
  },
  {
    icon: CreditCard,
    title: "Multi-Bank Support"
  },
  {
    icon: TrendingUp,
    title: "Investment Tracking"
  }
];

export default function FeaturesSection() {
  return (
    <section className="w-full delay-[1100ms] sm:mt-12">
      <div className="mx-auto grid w-full text-white gap-x-12 gap-y-12 tracking-tight sm:grid-cols-6 sm:gap-y-16">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="group flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <div className="flex items-start justify-start mb-1">
              <feature.icon className="h-14 w-14 text-stone-800 transition duration-300 group-hover:scale-110" />
            </div>
            <h2 className="text-2xl font-medium leading-tighter text-stone-800">
              {feature.title}
            </h2>
          </motion.div>
        ))}
      </div>
    </section>
  );
} 