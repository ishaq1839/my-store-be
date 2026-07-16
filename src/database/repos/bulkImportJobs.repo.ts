import { getDb } from "../firestoreAdmin";

export type BulkImportJobStatus = "queued" | "processing" | "completed" | "failed";

export type BulkImportJobResultRow =
  | {
      index: number;
      ok: true;
      item_id: string;
      batch_id: string;
      name: string;
    }
  | {
      index: number;
      ok: false;
      name?: string;
      error: string;
    };

export type BulkImportJobRecord = {
  job_id: string;
  store_uuid: string;
  status: BulkImportJobStatus;
  total: number;
  processed: number;
  created: number;
  failed: number;
  results: BulkImportJobResultRow[];
  error: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

function jobsCol(store_uuid: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("bulk_import_jobs");
}

export async function createBulkImportJob(input: {
  store_uuid: string;
  created_by: string;
  total: number;
}): Promise<BulkImportJobRecord> {
  const job_id = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  const now = new Date().toISOString();
  const record: BulkImportJobRecord = {
    job_id,
    store_uuid: String(input.store_uuid),
    status: "queued",
    total: input.total,
    processed: 0,
    created: 0,
    failed: 0,
    results: [],
    error: null,
    created_by: String(input.created_by),
    created_at: now,
    started_at: null,
    completed_at: null,
  };
  await jobsCol(input.store_uuid).doc(job_id).set(record);
  return record;
}

export async function getBulkImportJob(
  store_uuid: string,
  job_id: string,
): Promise<BulkImportJobRecord | null> {
  const snap = await jobsCol(store_uuid).doc(String(job_id)).get();
  if (!snap.exists) return null;
  return snap.data() as BulkImportJobRecord;
}

export async function updateBulkImportJob(
  store_uuid: string,
  job_id: string,
  patch: Partial<
    Pick<
      BulkImportJobRecord,
      | "status"
      | "processed"
      | "created"
      | "failed"
      | "results"
      | "error"
      | "started_at"
      | "completed_at"
    >
  >,
): Promise<void> {
  await jobsCol(store_uuid).doc(String(job_id)).set(patch, { merge: true });
}
