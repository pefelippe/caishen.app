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
          Assessment: '@mny/database#AssessmentRow',
          Attachment: '@mny/database#AttachmentRow',
          Buddy: '@mny/database#BuddyRow',
          Conversation: '@mny/database#ConversationRow',
          Message: '@mny/database#MessageRow',
          Pomodoro: '@mny/database#PomodoroRow',
          Project: '@mny/database#ProjectRow',
          Task: '@mny/database#TaskRow',
          Workout: '@mny/database#WorkoutRow',
          CreditCard: '@mny/database#CreditCardRow',
          CreditOperation: '@mny/database#CreditOperationRow',
          Holder: '@mny/database#HolderRow',
          IncomeSource: '@mny/database#IncomeSourceRow',
          LatePayment: '@mny/database#LatePaymentRow',
          Note: '@mny/database#NoteRow',
          ReportedScore: '@mny/database#ReportedScoreRow',
          ScrEntry: '@mny/database#ScrEntryRow',
          ScrSnapshot: '@mny/database#ScrSnapshotRow',
          Statement: '@mny/database#StatementRow',
          Consent: '@mny/database#ConsentRow',
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
