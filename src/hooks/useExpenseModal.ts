import { create } from 'zustand'

interface ExpenseModalStore {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

export const useExpenseModal = create<ExpenseModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
})) 