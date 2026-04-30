/**
 * Durable escalation workflow (Temporal.io).
 *
 * Why Temporal: escalation timers span up to 6 hours. If the API server
 * crashes mid-escalation, Temporal resumes from the exact point it left off
 * because all state is persisted in Temporal's database.
 *
 * Signal handlers allow the workflow to be interrupted mid-flight:
 *   - "trekEnded"    → trekker checked out safely, cancel all remaining timers
 *   - "extendTime"   → planned_end was pushed forward, reset L0 timer
 *   - "sosTrigger"   → jump straight to L4 regardless of elapsed time
 *
 * Workflow is idempotent by construction: Temporal deduplicates on workflowId.
 * We use trek_id as the workflowId — re-starting the same trek always replays
 * the same workflow rather than spawning a duplicate.
 */
import {
  proxyActivities,
  sleep,
  setHandler,
  defineSignal,
  condition,
  log,
} from '@temporalio/workflow';
import type { EscalationContext } from '../activities/escalation.activities';
import { ESCALATION_OFFSETS_MS } from '@shikhar/shared';

// Import activities via proxy — Temporal intercepts and routes to the worker.
const {
  sendL0SoftCheck,
  sendL1EContactAlert,
  sendL2WelfareCheck,
  sendL3SentinelDispatch,
  sendL4AuthorityEscalation,
} = proxyActivities<
  typeof import('../activities/escalation.activities')
>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 3, initialInterval: '10 seconds' },
});

// Signals — sent from the NestJS API via the Temporal client.
export const trekEndedSignal = defineSignal('trekEnded');
export const extendTimeSignal = defineSignal<[{ newPlannedEndAt: string }]>('extendTime');
export const sosTriggerSignal = defineSignal<[{ mode: string }]>('sosTrigger');

export async function escalationWorkflow(ctx: EscalationContext): Promise<void> {
  let trekEnded = false;
  let sosFired = false;
  let plannedEndAt = new Date(ctx.plannedEndAt);

  setHandler(trekEndedSignal, () => {
    trekEnded = true;
    log.info('Trek ended signal received — cancelling escalation ladder', { trekId: ctx.trekId });
  });

  setHandler(extendTimeSignal, ({ newPlannedEndAt }) => {
    plannedEndAt = new Date(newPlannedEndAt);
    log.info('Planned end time extended', { trekId: ctx.trekId, newPlannedEndAt });
  });

  setHandler(sosTriggerSignal, ({ mode }) => {
    sosFired = true;
    log.info('SOS signal received — jumping to L4', { trekId: ctx.trekId, mode });
  });

  // ── L0: Soft check AT planned_end ──────────────────────────────────────────
  await sleepUntilOrCancelled(plannedEndAt, () => trekEnded || sosFired);
  if (trekEnded) return;
  if (!sosFired) await sendL0SoftCheck(ctx);

  // Wait 30 min for the trekker to respond (tap "I'm safe" or check out).
  const l0Responded = await condition(
    () => trekEnded,
    ESCALATION_OFFSETS_MS.L1, // 30 min timeout
  );
  if (l0Responded || trekEnded) return;

  // ── L1: E-Contact alert at planned_end + 30 min ────────────────────────────
  if (!sosFired) {
    await sendL1EContactAlert(ctx);
    log.info('L1 fired', { trekId: ctx.trekId });
  }

  const l1Resolved = await condition(() => trekEnded, ESCALATION_OFFSETS_MS.L2 - ESCALATION_OFFSETS_MS.L1);
  if (l1Resolved || trekEnded) return;

  // ── L2: Welfare check at planned_end + 2h ─────────────────────────────────
  if (!sosFired) {
    await sendL2WelfareCheck(ctx);
    log.info('L2 fired', { trekId: ctx.trekId });
  }

  const l2Resolved = await condition(() => trekEnded, ESCALATION_OFFSETS_MS.L3 - ESCALATION_OFFSETS_MS.L2);
  if (l2Resolved || trekEnded) return;

  // ── L3: Sentinel dispatch at planned_end + 4h ──────────────────────────────
  await sendL3SentinelDispatch(ctx);
  log.info('L3 fired', { trekId: ctx.trekId });

  const l3Resolved = await condition(() => trekEnded, ESCALATION_OFFSETS_MS.L4 - ESCALATION_OFFSETS_MS.L3);
  if (l3Resolved || trekEnded) return;

  // ── L4: Authority escalation at planned_end + 6h (or immediate on SOS) ────
  await sendL4AuthorityEscalation(ctx);
  log.info('L4 fired', { trekId: ctx.trekId });

  // ── L5: Continuous monitoring until manually resolved ─────────────────────
  // Workflow remains open; the T&S team resolves it via the admin dashboard.
  await condition(() => trekEnded, '7 days');
}

/**
 * Sleeps until a target time, but wakes early if the cancel predicate becomes true.
 * Uses a poll loop (condition check every ~1s) to respect Temporal's deterministic
 * execution model — we cannot use real Date.now() inside workflows.
 */
async function sleepUntilOrCancelled(
  target: Date,
  cancelled: () => boolean,
): Promise<void> {
  const nowMs = Date.now();
  const targetMs = target.getTime();
  const waitMs = Math.max(targetMs - nowMs, 0);

  if (waitMs <= 0) return;

  await Promise.race([
    sleep(waitMs),
    condition(cancelled),
  ]);
}
