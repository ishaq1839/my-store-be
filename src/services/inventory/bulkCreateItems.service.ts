import { AppError } from "../../errors/AppError";
import {
  createBulkImportJob,
  getBulkImportJob,
  updateBulkImportJob,
  type BulkImportJobResultRow,
} from "../../database/repos/bulkImportJobs.repo";
import { assertCanManageStoreInventory } from "./assertStoreInventoryAccess.service";
import { createItemBatchService } from "./createItemBatch.service";

export type BulkCreateItemRow = {
  type: "single" | "carton";
  name: string;
  description: string;
  retail_price: number;
  sale_price?: number | null;
  total_items: number;
};

async function processBulkImportJob(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  job_id: string;
  items: BulkCreateItemRow[];
}) {
  const results: BulkImportJobResultRow[] = [];
  let created = 0;
  let failed = 0;

  try {
    await updateBulkImportJob(input.store_uuid, input.job_id, {
      status: "processing",
      started_at: new Date().toISOString(),
    });

    for (let index = 0; index < input.items.length; index++) {
      const row = input.items[index];
      try {
        const result = await createItemBatchService({
          actor: input.actor,
          store_uuid: input.store_uuid,
          type: row.type,
          name: row.name,
          description: row.description,
          retail_price: row.retail_price,
          sale_price: row.sale_price,
          total_items: row.total_items,
        });

        created += 1;
        results.push({
          index,
          ok: true,
          item_id: result.item_id,
          batch_id: result.batch_id,
          name: row.name,
        });
      } catch (err) {
        failed += 1;
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to create item";
        results.push({
          index,
          ok: false,
          name: row.name,
          error: message,
        });
      }

      // Progress update so UI can poll without waiting for full completion.
      await updateBulkImportJob(input.store_uuid, input.job_id, {
        processed: index + 1,
        created,
        failed,
        results,
      });
    }

    await updateBulkImportJob(input.store_uuid, input.job_id, {
      status: "completed",
      processed: input.items.length,
      created,
      failed,
      results,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Bulk import failed";
    await updateBulkImportJob(input.store_uuid, input.job_id, {
      status: "failed",
      processed: results.length,
      created,
      failed,
      results,
      error: message,
      completed_at: new Date().toISOString(),
    });
  }
}

/** Validates access, enqueues work, returns immediately with job_id. */
export async function enqueueBulkCreateItemsService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  items: BulkCreateItemRow[];
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const job = await createBulkImportJob({
    store_uuid: input.store_uuid,
    created_by: input.actor.uuid,
    total: input.items.length,
  });

  // Fire-and-forget; do not await.
  void processBulkImportJob({
    actor: input.actor,
    store_uuid: input.store_uuid,
    job_id: job.job_id,
    items: input.items,
  });

  return {
    job_id: job.job_id,
    status: job.status,
    total: job.total,
  };
}

export async function getBulkImportJobService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  job_id: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const job = await getBulkImportJob(input.store_uuid, input.job_id);
  if (!job) throw new AppError("Bulk import job not found", { statusCode: 404 });

  return {
    job_id: job.job_id,
    status: job.status,
    total: job.total,
    processed: job.processed,
    created: job.created,
    failed: job.failed,
    results: job.results,
    error: job.error,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
  };
}
