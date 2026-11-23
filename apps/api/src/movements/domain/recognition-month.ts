import { type IsoDate, monthOf, type YearMonth } from "@miplata/shared";

export function nonCardRecognitionMonth(movementDate: IsoDate): YearMonth {
  return monthOf(movementDate);
}

export function cardRecognitionMonth(statementClosingDate: IsoDate): YearMonth {
  return monthOf(statementClosingDate);
}
