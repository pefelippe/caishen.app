/**
 * Modalities of a Credit Operation. `bacenName` is the modality name in the Bacen open interest
 * rate dataset, used to look up the Market Rate; `null` when Bacen publishes no comparable rate.
 */
export const MODALITIES = {
  CARD_INSTALLMENT: {
    bacenName: 'Cartão de crédito - parcelado - Prefixado',
    label: 'Cartão de crédito parcelado',
  },
  GOODS_FINANCING: {
    bacenName: 'Aquisição de outros bens - Prefixado',
    label: 'Financiamento de bens',
  },
  OTHER: { bacenName: null, label: 'Outro' },
  OVERDRAFT: { bacenName: 'Cheque especial - Prefixado', label: 'Cheque especial' },
  PAYROLL_LOAN_INSS: {
    bacenName: 'Crédito pessoal consignado INSS - Prefixado',
    label: 'Consignado INSS',
  },
  PAYROLL_LOAN_PRIVATE: {
    bacenName: 'Crédito pessoal consignado privado - Prefixado',
    label: 'Consignado privado',
  },
  PAYROLL_LOAN_PUBLIC: {
    bacenName: 'Crédito pessoal consignado público - Prefixado',
    label: 'Consignado público',
  },
  PERSONAL_LOAN: {
    bacenName: 'Crédito pessoal não consignado - Prefixado',
    label: 'Crédito pessoal',
  },
  REAL_ESTATE_FINANCING: {
    bacenName: 'Financiamento imobiliário com taxas de mercado - Prefixado',
    label: 'Financiamento imobiliário',
  },
  VEHICLE_FINANCING: {
    bacenName: 'Aquisição de veículos - Prefixado',
    label: 'Financiamento de veículo',
  },
} as const satisfies Record<string, { bacenName: string | null; label: string }>;

export type Modality = keyof typeof MODALITIES;

export const MODALITY_KEYS = Object.keys(MODALITIES) as [Modality, ...Modality[]];

/** The Modalities that pay for a good (a vehicle, a home, other goods): the Financiamentos. */
export const FINANCING_MODALITIES: readonly Modality[] = [
  'GOODS_FINANCING',
  'REAL_ESTATE_FINANCING',
  'VEHICLE_FINANCING',
];

/** Whether an Operation is a Financiamento; every other one is an Empréstimo. */
export const isFinancing = (modality: Modality): boolean => FINANCING_MODALITIES.includes(modality);
