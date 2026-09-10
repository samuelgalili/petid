/**
 * CentralBrainContext — pre-loaded pet context for the Guardian panel and the
 * admin Brain debugger.
 *
 * ── Status, and why it is still here ──────────────────────────────────────
 * This provider is mounted globally but has no rendered consumers today:
 * PetGuardianPanel and BrainDebuggerOverlay both import it and neither is
 * rendered anywhere. It was fetching the pet, its vet visits and fifteen
 * documents on every active-pet change, and nothing read the result. That
 * fetch is now lazy — it runs when a consumer actually mounts (see
 * useCentralBrain below), so with no consumers it costs nothing.
 *
 * It is deliberately NOT deleted. It is the only place in the repository where
 * document-extraction shape, profile-versus-document discrepancy detection and
 * source precedence were worked out, and those are the concepts P1 moves to the
 * server. See docs/pet-intelligence/54 §3 for the per-capability disposition:
 *
 *   calculateNrc          → server, internal only. NEVER owner-facing feeding
 *                           guidance (DD-02). Currently unreachable.
 *   OcrRecord             → informs pet_document_extractions (doc 40).
 *                           setOcrRecords is [] — there is no producer.
 *   detectDiscrepancies   → informs petFactResolution (doc 45). Cannot fire
 *                           while ocrRecords is empty.
 *   getField precedence   → informs the source hierarchy (doc 45).
 *   resolveDiscrepancy    → becomes a fact confirmation write.
 *   brainSnapshot         → stays client-side, re-sourced from Pet 360.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { usePetPreference } from "./PetPreferenceContext";
import { getMyDocuments, getMyPet, getMyVetVisits } from "@/lib/mipoApi";

// ============= Types =============
export interface NrcCalculation {
  rer: number;
  mer: number;
  factor: number;
  weightKg: number;
}

export interface OcrRecord {
  vaccination_type: string | null;
  vaccination_date: string | null;
  vaccination_expiry: string | null;
  treatment_type: string | null;
  treatment_date: string | null;
  diagnosis: string | null;
  chip_number: string | null;
  provider_name: string | null;
}

export interface VetVisit {
  visit_date: string;
  visit_type: string;
  clinic_name: string | null;
  vet_name: string | null;
  diagnosis: string | null;
  treatment: string | null;
  vaccines: string[] | null;
  medications: string[] | null;
  is_recovery_mode: boolean | null;
  next_visit_date: string | null;
}

export interface DocumentRecord {
  title: string | null;
  description: string | null;
  document_type: string | null;
}

export interface DiscrepancyAlert {
  field: string;
  profileValue: string | null;
  documentValue: string | null;
  source: string;
}

export interface BrainSnapshot {
  petId: string | null;
  petProfile: Record<string, any> | null;
  nrc: NrcCalculation | null;
  ocrRecords: OcrRecord[];
  vetVisits: VetVisit[];
  documents: DocumentRecord[];
  discrepancies: DiscrepancyAlert[];
  resolvedFields: Record<string, string>;
  timestamp: string;
  dataSourceCount: number;
}

interface CentralBrainContextType {
  /** Full brain snapshot for the active pet — fed to all agents */
  brainSnapshot: BrainSnapshot;
  /** Loading state */
  loading: boolean;
  /** Force refresh brain data */
  refreshBrain: () => void;
  /** Get a field value with no-ignorance rule: checks all sources */
  getField: (fieldName: string) => string | null;
  /** All discrepancies between scanned docs and manual entries */
  discrepancies: DiscrepancyAlert[];
  /** Mark a discrepancy as resolved with chosen value */
  resolveDiscrepancy: (field: string, chosenValue: string) => void;
}

const CentralBrainContext = createContext<CentralBrainContextType | undefined>(undefined);

// ============= NRC Calculator =============
function calculateNrc(weight: number | null, isNeutered: boolean): NrcCalculation | null {
  if (!weight || weight <= 0) return null;
  const rer = Math.round(70 * Math.pow(weight, 0.75));
  const factor = isNeutered ? 1.6 : 1.8;
  const mer = Math.round(rer * factor);
  return { rer, mer, factor, weightKg: weight };
}

// ============= Discrepancy Detector =============
function detectDiscrepancies(
  petData: Record<string, any> | null,
  ocrRecords: OcrRecord[],
): DiscrepancyAlert[] {
  if (!petData || ocrRecords.length === 0) return [];
  const alerts: DiscrepancyAlert[] = [];

  // Check chip_number discrepancy
  const profileChip = petData.microchip_number;
  const ocrChip = ocrRecords.find(r => r.chip_number)?.chip_number;
  if (profileChip && ocrChip && profileChip !== ocrChip) {
    alerts.push({
      field: "microchip_number",
      profileValue: profileChip,
      documentValue: ocrChip,
      source: "OCR scan",
    });
  }

  // A vet-name comparison stood here reading `petData.vet_name`. That column is
  // one of the eleven the API never returns (docs/pet-intelligence/31), so the
  // profile side was always undefined and the check could never fire even once
  // OCR records exist. The clinic name on pet_vet_visits is the live field; the
  // comparison belongs there, on the server, in P1.

  return alerts;
}

// ============= Provider =============
export const CentralBrainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activePet } = usePetPreference();
  const [loading, setLoading] = useState(true);
  const [petData, setPetData] = useState<Record<string, any> | null>(null);
  const [ocrRecords, setOcrRecords] = useState<OcrRecord[]>([]);
  const [vetVisits, setVetVisits] = useState<VetVisit[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [resolvedFields, setResolvedFields] = useState<Record<string, string>>({});

  const fetchBrainData = useCallback(async () => {
    if (!activePet?.id) {
      setPetData(null);
      setOcrRecords([]);
      setVetVisits([]);
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const petId = activePet.id;

    try {
      const [petResult, vetResult, docResult] = await Promise.all([
        getMyPet(petId).catch(() => activePet || null),
        getMyVetVisits(petId).catch(() => []),
        getMyDocuments({ pet_id: petId, limit: 15 }).catch(() => []),
      ]);

      setPetData(petResult ? { ...petResult } : null);
      setOcrRecords([]);
      setVetVisits(vetResult.map((visit) => ({
        visit_date: visit.visit_date || "",
        visit_type: visit.visit_type || "",
        clinic_name: visit.clinic_name || null,
        vet_name: visit.vet_name || null,
        diagnosis: visit.diagnosis || null,
        treatment: visit.treatment || null,
        vaccines: visit.vaccines || null,
        medications: null,
        is_recovery_mode: visit.is_recovery_mode || null,
        next_visit_date: visit.next_visit_date || null,
      })));
      setDocuments(docResult.map((document) => ({
        title: document.title || null,
        description: document.description || null,
        document_type: document.document_type || null,
      })));
    } catch (err) {
      console.error("CentralBrain fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activePet?.id]);

  // Deliberately not fetched here. The provider wraps the whole app, so an
  // effect at this level ran three requests per active-pet change for data
  // nothing was reading. useCentralBrain triggers the load instead, so the cost
  // is paid only by a screen that actually wants it.

  // NRC calculation
  const nrc = useMemo(() => {
    if (!petData) return null;
    return calculateNrc(petData.weight, petData.is_neutered === true);
  }, [petData]);

  // Discrepancy detection
  const discrepancies = useMemo(() => {
    return detectDiscrepancies(petData, ocrRecords);
  }, [petData, ocrRecords]);

  // No-Ignorance Rule: field resolver across all data sources
  const getField = useCallback((fieldName: string): string | null => {
    // 1. Check resolved overrides
    if (resolvedFields[fieldName]) return resolvedFields[fieldName];

    // 2. Check pet profile (primary)
    if (petData?.[fieldName] && petData[fieldName] !== "לא ידוע") {
      return String(petData[fieldName]);
    }

    // 3. Check OCR records (secondary)
    const fieldMap: Record<string, keyof OcrRecord> = {
      microchip_number: "chip_number",
      chip_number: "chip_number",
      vet_name: "provider_name",
    };
    const ocrKey = fieldMap[fieldName];
    if (ocrKey) {
      const ocrVal = ocrRecords.find(r => r[ocrKey])?.[ocrKey];
      if (ocrVal) return String(ocrVal);
    }

    // A fourth tier searched document titles for keywords and returned the
    // literal string `[Found in document: "..."]`. That is not a value: a
    // caller asking for a microchip number would have rendered that sentence
    // where the number goes. Finding a document that mentions a chip is not
    // knowing the chip number — that is what extraction is for (doc 40).
    return null;
  }, [petData, ocrRecords, resolvedFields]);

  // Resolve discrepancy
  const resolveDiscrepancy = useCallback((field: string, chosenValue: string) => {
    setResolvedFields(prev => ({ ...prev, [field]: chosenValue }));
  }, []);

  // Brain snapshot for debugger
  const brainSnapshot = useMemo<BrainSnapshot>(() => ({
    petId: activePet?.id || null,
    petProfile: petData,
    nrc,
    ocrRecords,
    vetVisits,
    documents,
    discrepancies,
    resolvedFields,
    timestamp: new Date().toISOString(),
    dataSourceCount: [
      petData ? 1 : 0,
      ocrRecords.length > 0 ? 1 : 0,
      vetVisits.length > 0 ? 1 : 0,
      documents.length > 0 ? 1 : 0,
    ].reduce((a, b) => a + b, 0),
  }), [activePet?.id, petData, nrc, ocrRecords, vetVisits, documents, discrepancies, resolvedFields]);

  return (
    <CentralBrainContext.Provider value={{ brainSnapshot, loading, refreshBrain: fetchBrainData, getField, discrepancies, resolveDiscrepancy }}>
      {children}
    </CentralBrainContext.Provider>
  );
};

/**
 * Subscribing to the brain is what loads it.
 *
 * The provider holds the state; this hook asks for the data. With no mounted
 * consumer nothing is fetched, which is the case today.
 */
export const useCentralBrain = () => {
  const context = useContext(CentralBrainContext);
  if (context === undefined) {
    throw new Error("useCentralBrain must be used within a CentralBrainProvider");
  }

  const { refreshBrain } = context;
  useEffect(() => {
    refreshBrain();
  }, [refreshBrain]);

  return context;
};
