/**
 * useDataGapAlert — Detects missing critical fields on the active pet
 * and returns the first gap to prompt the user to fill.
 */
import { useMemo } from "react";
import { useActivePet } from "@/hooks/useActivePet";

export interface DataGap {
  field: "weight" | "birth_date" | "breed" | "neutered_status";
  label: string;
  labelHe: string;
  inputType: "number" | "date" | "text" | "boolean";
  placeholder: string;
  unit?: string;
  dbColumn: string;
}

const CRITICAL_FIELDS: DataGap[] = [
  {
    field: "weight",
    label: "Weight",
    labelHe: "משקל",
    inputType: "number",
    placeholder: "e.g. 12",
    unit: "kg",
    dbColumn: "weight",
  },
  {
    field: "birth_date",
    label: "Date of Birth",
    labelHe: "תאריך לידה",
    inputType: "date",
    placeholder: "YYYY-MM-DD",
    dbColumn: "birth_date",
  },
  {
    field: "breed",
    label: "Breed",
    labelHe: "גזע",
    inputType: "text",
    placeholder: "e.g. Golden Retriever",
    dbColumn: "breed",
  },
];

export function useDataGapAlert() {
  const { pet, loading } = useActivePet();

  const gaps = useMemo<DataGap[]>(() => {
    if (!pet) return [];
    const missing: DataGap[] = [];
    for (const g of CRITICAL_FIELDS) {
      const val = (pet as any)[g.field];
      if (val === null || val === undefined || val === "") {
        missing.push(g);
      }
    }
    return missing;
  }, [pet]);

  return {
    pet,
    loading,
    gaps,
    firstGap: gaps[0] ?? null,
    totalGaps: gaps.length,
  };
}
