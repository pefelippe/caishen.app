'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Coins} from 'lucide-react';
import { Link as ScrollLink } from 'react-scroll';
import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HeroSection } from '@/components/landing/HeroSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled ? 'bg-white/80 backdrop-blur-sm border-b border-gray-200' : 'bg-transparent'
      }`}>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3"
            >
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                  Caishen
                </span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-6"
            >
              <nav className="hidden md:flex items-center gap-8">
                <ScrollLink
                  to="about"
                  spy={true}
                  smooth={true}
                  offset={-100}
                  duration={500}
                  className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  About
                </ScrollLink>
                <ScrollLink
                  to="pricing"
                  spy={true}
                  smooth={true}
                  offset={-100}
                  duration={500}
                  className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  Pricing
                </ScrollLink>
                <ScrollLink
                  to="faq"
                  spy={true}
                  smooth={true}
                  offset={-100}
                  duration={500}
                  className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  FAQ
                </ScrollLink>
              </nav>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ">
          <HeroSection />
        </div>
        <BenefitsSection />

        {/* Pricing Section */}
        <div className="mt-40" id="pricing">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Choose the plan that best fits your needs
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {/* Free Plan */}
              <div className="relative flex flex-col p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Free</h3>
                  <p className="mt-4 flex items-baseline text-gray-900">
                    <span className="text-5xl font-extrabold tracking-tight">$0</span>
                    <span className="ml-1 text-xl font-semibold">/month</span>
                  </p>
                  <p className="mt-6 text-gray-500">Perfect for getting started</p>
                  <ul className="mt-6 space-y-4">
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Basic expense tracking</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">WhatsApp notifications</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Basic AI insights</p>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/signup')}
                  className="mt-8 block w-full bg-emerald-600 text-white rounded-lg px-6 py-3 text-center font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Get Started
                </button>
              </div>

              {/* Pro Plan */}
              <div className="relative flex flex-col p-8 bg-white border-2 border-emerald-500 rounded-2xl shadow-lg">
                <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-1 text-center text-sm font-medium text-white">
                  Most Popular
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Pro</h3>
                  <p className="mt-4 flex items-baseline text-gray-900">
                    <span className="text-5xl font-extrabold tracking-tight">$5</span>
                    <span className="ml-1 text-xl font-semibold">/month</span>
                  </p>
                  <p className="mt-6 text-gray-500">For serious financial management</p>
                  <ul className="mt-6 space-y-4">
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Everything in Free</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Advanced AI insights</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Custom categories</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Priority support</p>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/signup')}
                  className="mt-8 block w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg px-6 py-3 text-center font-medium hover:from-emerald-700 hover:to-green-700 transition-colors cursor-pointer"
                >
                  Get Started
                </button>
              </div>

              {/* Enterprise Plan */}
              {/* <div className="relative flex flex-col p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Enterprise</h3>
                  <p className="mt-4 flex items-baseline text-gray-900">
                    <span className="text-5xl font-extrabold tracking-tight">$25</span>
                    <span className="ml-1 text-xl font-semibold">/month</span>
                  </p>
                  <p className="mt-6 text-gray-500">For power users and businesses</p>
                  <ul className="mt-6 space-y-4">
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Everything in Pro</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Multiple accounts</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">Advanced analytics</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-3 text-sm text-gray-500">24/7 dedicated support</p>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/signup')}
                  className="mt-8 block w-full bg-emerald-600 text-white rounded-lg px-6 py-3 text-center font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Get Started
                </button>
              </div> */}
            </motion.div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-40 bg-gray-50" id="faq">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Everything you need to know about Caishen - Track your money
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 max-w-3xl mx-auto"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="whatsapp">
                  <AccordionTrigger className="text-lg font-semibold">
                    How does the WhatsApp integration work?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Our WhatsApp integration allows you to receive instant notifications about your expenses, savings goals, and financial insights directly to your WhatsApp. You can also send messages to track expenses on the go. Simply connect your WhatsApp number in the app settings, and you'll start receiving real-time updates about your financial activities.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-insights">
                  <AccordionTrigger className="text-lg font-semibold">
                    What kind of AI insights do you provide?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Our AI analyzes your spending patterns to provide personalized recommendations for saving money, identify unusual expenses, and help you make better financial decisions based on your habits. The AI learns from your behavior to offer increasingly accurate insights over time, helping you optimize your spending and savings strategies.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="plans">
                  <AccordionTrigger className="text-lg font-semibold">
                    Can I upgrade or downgrade my plan?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Yes, you can change your plan at any time. When upgrading, you'll be charged the prorated amount for the remainder of your billing cycle. When downgrading, the new rate will apply at the start of your next billing cycle. All your data and settings will be preserved when changing plans.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security">
                  <AccordionTrigger className="text-lg font-semibold">
                    Is my financial data secure?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Yes, we take security very seriously. All your data is encrypted, and we use bank-level security measures to protect your information. We never share your data with third parties without your explicit consent. Our security protocols are regularly audited and updated to ensure the highest level of protection.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-export">
                  <AccordionTrigger className="text-lg font-semibold">
                    Can I export my financial data?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Yes, you can export your financial data in various formats including CSV, PDF, and Excel. This feature is available in all plans, allowing you to maintain your own records or use the data with other financial tools.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="categories">
                  <AccordionTrigger className="text-lg font-semibold">
                    How does expense categorization work?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Our system automatically categorizes your expenses using AI. It learns from your manual corrections to improve accuracy over time. Pro and Enterprise users can create custom categories and rules for more precise tracking.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support">
                  <AccordionTrigger className="text-lg font-semibold">
                    What kind of support do you offer?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Free users have access to our help center and community forums. Pro users get priority email support, while Enterprise users receive 24/7 dedicated support with a personal account manager. All users can access our comprehensive documentation and video tutorials.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mobile">
                  <AccordionTrigger className="text-lg font-semibold">
                    Is there a mobile app available?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500">
                    Yes, we offer mobile apps for both iOS and Android. The apps provide full functionality, including expense tracking, AI insights, and WhatsApp integration. You can download them from the App Store or Google Play Store.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-40 text-center"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              Ready to start your journey?
            </h2>
            <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
              Join thousands of users who are already managing their finances better.
            </p>
            <div className="mt-10">
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-full text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-40 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl">
                  <Coins className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                    Caishen
                  </span>
                  <span className="text-xs text-gray-500 -mt-1">Track your money</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm max-w-md">
                Track your expenses, manage your budget, and get smart insights to improve your financial health.
                It&apos;s time to take control of your finances.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <ScrollLink
                    to="about"
                    spy={true}
                    smooth={true}
                    offset={-100}
                    duration={500}
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    About
                  </ScrollLink>
                </li>
                <li>
                  <ScrollLink
                    to="pricing"
                    spy={true}
                    smooth={true}
                    offset={-100}
                    duration={500}
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    Pricing
                  </ScrollLink>
                </li>
                <li>
                  <ScrollLink
                    to="faq"
                    spy={true}
                    smooth={true}
                    offset={-100}
                    duration={500}
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    FAQ
                  </ScrollLink>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact</h3>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:support@caishenapp.com" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                    support@caishenapp.com
                  </a>
                </li>
                <li>
                  <a href="tel:+1234567890" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                    +1 (234) 567-890
                  </a>
                </li>
                <li className="text-sm text-gray-500">
                  São Paulo, Brazil
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © 2024 Caishen - Track your money. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
