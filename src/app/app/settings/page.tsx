"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    currency: 'BRL',
    language: 'pt-BR',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactor: false
  });

  const currencies = [
    { value: 'BRL', label: 'Real Brasileiro (R$)' },
    { value: 'USD', label: 'Dólar Americano ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'Libra Esterlina (£)' }
  ];

  const languages = [
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Español' }
  ];

  const handleProfileSave = () => {
    // Aqui você implementaria a lógica para salvar os dados do perfil
    console.log('Salvando dados do perfil:', profileData);
  };

  const handleSecuritySave = () => {
    // Aqui você implementaria a lógica para salvar as configurações de segurança
    console.log('Salvando configurações de segurança:', securityData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie suas preferências e configurações da conta</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-stone-800 text-stone-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-stone-800 text-stone-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Segurança
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-stone-800 text-stone-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Notificações
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preferences'
                ? 'border-stone-800 text-stone-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Preferências
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Informações do Perfil</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="currency">Moeda</Label>
                <Select value={profileData.currency} onValueChange={(value) => setProfileData({...profileData, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleProfileSave} className="bg-stone-800 hover:bg-stone-900">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Segurança da Conta</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                    placeholder="Digite sua senha atual"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={securityData.newPassword}
                    onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                    placeholder="Digite a nova senha"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="twoFactor"
                  checked={securityData.twoFactor}
                  onChange={(e) => setSecurityData({...securityData, twoFactor: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="twoFactor">Ativar Autenticação de Dois Fatores</Label>
              </div>
              
              <div className="mt-6">
                <Button onClick={handleSecuritySave} className="bg-stone-800 hover:bg-stone-900">
                  Atualizar Segurança
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Configurações de Notificação</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Notificações por Email</h4>
                  <p className="text-sm text-gray-500">Receba alertas importantes por email</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications.email}
                  onChange={(e) => setProfileData({
                    ...profileData, 
                    notifications: {...profileData.notifications, email: e.target.checked}
                  })}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Notificações Push</h4>
                  <p className="text-sm text-gray-500">Receba notificações no navegador</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications.push}
                  onChange={(e) => setProfileData({
                    ...profileData, 
                    notifications: {...profileData.notifications, push: e.target.checked}
                  })}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Notificações SMS</h4>
                  <p className="text-sm text-gray-500">Receba alertas por SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications.sms}
                  onChange={(e) => setProfileData({
                    ...profileData, 
                    notifications: {...profileData.notifications, sms: e.target.checked}
                  })}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="mt-6">
                <Button onClick={handleProfileSave} className="bg-stone-800 hover:bg-stone-900">
                  Salvar Notificações
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Preferências Gerais</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="language">Idioma</Label>
                <Select value={profileData.language} onValueChange={(value) => setProfileData({...profileData, language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Moeda Padrão</Label>
                <Select value={profileData.currency} onValueChange={(value) => setProfileData({...profileData, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6">
              <Button onClick={handleProfileSave} className="bg-stone-800 hover:bg-stone-900">
                Salvar Preferências
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Actions */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ações da Conta</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Exportar Dados</h4>
                <p className="text-sm text-gray-500">Baixe todos os seus dados em formato CSV</p>
              </div>
              <Button variant="outline" size="sm">
                Exportar
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Excluir Conta</h4>
                <p className="text-sm text-gray-500">Exclua permanentemente sua conta e todos os dados</p>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 