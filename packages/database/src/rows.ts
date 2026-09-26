import type * as schema from './schema';

export type AssessmentRow = typeof schema.assessment.$inferSelect;
export type ConsentRow = typeof schema.consent.$inferSelect;
export type CreditCardRow = typeof schema.creditCard.$inferSelect;
export type CreditOperationRow = typeof schema.creditOperation.$inferSelect;
export type HolderRow = typeof schema.holder.$inferSelect;
export type IncomeSourceRow = typeof schema.incomeSource.$inferSelect;
export type NoteRow = typeof schema.note.$inferSelect;
export type StatementRow = typeof schema.statement.$inferSelect;
export type LatePaymentRow = typeof schema.latePayment.$inferSelect;
export type ReportedScoreRow = typeof schema.reportedScore.$inferSelect;
