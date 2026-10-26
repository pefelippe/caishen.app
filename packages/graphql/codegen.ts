import type { CodegenConfig } from '@graphql-codegen/cli';

const scalars = {
  Cents: 'number',
  Date: 'string',
  DateTime: 'string',
};

const config: CodegenConfig = {
  generates: {
    './src/generated/client.ts': {
      config: { avoidOptionals: false, enumsAsTypes: true, scalars, useTypeImports: true },
      documents: './src/operations/**/*.graphql',
      plugins: ['typescript-operations', 'typed-document-node'],
    },
    './src/generated/resolvers.ts': {
      config: {
        contextType: '../context#Context',
        enumsAsTypes: true,
        mappers: {
          Assessment: '@zapbots/database#AssessmentRow',
          Attachment: '@zapbots/database#AttachmentRow',
          BankLink: '@zapbots/database#BankLinkRow',
          BankAccount: '@zapbots/database#BankAccountRow',
          Bot: '@zapbots/database#BotRow',
          Conversation: '@zapbots/database#ConversationRow',
          Job: '@zapbots/database#JobRow',
          Routine: '@zapbots/database#RoutineRow',
          Message: '@zapbots/database#MessageRow',
          Proposal: '@zapbots/database#ProposalRow',
          CreditCard: '@zapbots/database#CreditCardRow',
          CreditOperation: '@zapbots/database#CreditOperationRow',
          Holder: '@zapbots/database#HolderRow',
          IncomeSource: '@zapbots/database#IncomeSourceRow',
          Tax: '@zapbots/database#TaxRow',
          CompanyGuide: '@zapbots/database#CompanyGuideRow',
          RecurringExpense: '@zapbots/database#RecurringExpenseRow',
          Expense: '@zapbots/database#ExpenseRow',
          LatePayment: '@zapbots/database#LatePaymentRow',
          ReportedScore: '@zapbots/database#ReportedScoreRow',
          ScrEntry: '@zapbots/database#ScrEntryRow',
          ScrSnapshot: '@zapbots/database#ScrSnapshotRow',
          Statement: '@zapbots/database#StatementRow',
          Consent: '@zapbots/database#ConsentRow',
        },
        scalars: { ...scalars, DateTime: 'Date | string' },
        useIndexSignature: true,
        useTypeImports: true,
      },
      plugins: ['typescript', 'typescript-resolvers'],
    },
  },
  overwrite: true,
  schema: './src/schema/**/*.graphql',
};

export default config;
