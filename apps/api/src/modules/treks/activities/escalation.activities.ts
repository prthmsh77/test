/**
 * Temporal activities for the escalation workflow.
 * Activities are ordinary async functions — Temporal handles retries automatically.
 * Each activity must be idempotent: re-running it after a crash must not double-notify.
 *
 * In production, these call MSG91 (SMS), Exotel (voice), and the ERSS-112 integration.
 * In dev (env vars unset), they log to console so the workflow can be tested end-to-end
 * without real communications accounts.
 */
import axios from 'axios';

export interface EscalationContext {
  trekId: string;
  userId: string;
  userName: string;
  trailName?: string;
  trailRegion?: string;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastKnownAltM?: number;
  liveTrackUrl: string;
  emergencyContacts: Array<{
    id: string;
    name: string;
    phone: string;
    notifyBySms: boolean;
    notifyByWhatsapp: boolean;
  }>;
  erss112Consent: boolean;
  plannedEndAt: string;
}

/**
 * Maharashtra regions and their closest MMRCC affiliate rescue unit.
 * MMRCC central helpline: 7620-230-231 (24/7).
 * Affiliates from AMGM rescue committee (amgm.org).
 */
const MMRCC_HELPLINE = '917620230231';

const MMRCC_REGIONAL_CONTACTS: Record<string, { org: string; phone: string }> = {
  Maharashtra: { org: 'MMRCC Central', phone: MMRCC_HELPLINE },
  'Western Ghats': { org: 'MMRCC Central', phone: MMRCC_HELPLINE },
  Konkan: { org: 'Sahyadri Mitra (Mahad)', phone: MMRCC_HELPLINE },
  Pune: { org: 'Shivdurga Mitra (Lonavla)', phone: MMRCC_HELPLINE },
  Nashik: { org: 'MMRCC Central', phone: MMRCC_HELPLINE },
};

const MAHARASHTRA_REGIONS = new Set(Object.keys(MMRCC_REGIONAL_CONTACTS));

function getMmrccContact(trailRegion?: string): { org: string; phone: string } | null {
  if (!trailRegion) return null;
  for (const [key, contact] of Object.entries(MMRCC_REGIONAL_CONTACTS)) {
    if (trailRegion.toLowerCase().includes(key.toLowerCase())) return contact;
  }
  return null;
}

/**
 * L0: Send a soft "are you safe?" push to the trekker themselves.
 * No external notification yet — just an in-app prompt.
 */
export async function sendL0SoftCheck(ctx: EscalationContext): Promise<void> {
  console.log(`[escalation L0] Trek ${ctx.trekId}: soft check sent to user ${ctx.userId}`);
  // TODO Phase 7: trigger FCM push to trekker's device.
}

/**
 * L1: Notify all E-Contacts that the trekker hasn't checked out yet.
 */
export async function sendL1EContactAlert(ctx: EscalationContext): Promise<void> {
  const locationStr = ctx.lastKnownLat
    ? `Last seen at ${ctx.lastKnownLat.toFixed(4)},${ctx.lastKnownLng?.toFixed(4)}`
    : 'Last location unavailable';

  const message =
    `[Shikhar] ${ctx.userName} hasn't checked out from their trek yet. ` +
    `${locationStr}. Track live: ${ctx.liveTrackUrl}`;

  for (const contact of ctx.emergencyContacts) {
    if (contact.notifyBySms) {
      await sendSms(contact.phone, message);
    }
  }

  console.log(`[escalation L1] Trek ${ctx.trekId}: E-Contact SMS sent to ${ctx.emergencyContacts.length} contacts`);
}

/**
 * L2: High-priority alert — voice call + WhatsApp to E-Contacts.
 */
export async function sendL2WelfareCheck(ctx: EscalationContext): Promise<void> {
  const message =
    `[Shikhar URGENT] ${ctx.userName} has not responded to safety check. ` +
    `Please try to reach them. Live track: ${ctx.liveTrackUrl}`;

  for (const contact of ctx.emergencyContacts) {
    if (contact.notifyBySms) {
      await sendSms(contact.phone, message);
    }
    if (contact.notifyByWhatsapp) {
      await sendWhatsApp(contact.phone, message);
    }
  }

  // Voice call to the first confirmed E-Contact via Exotel.
  if (ctx.emergencyContacts.length > 0) {
    await sendVoiceCall(ctx.emergencyContacts[0].phone, ctx.userName);
  }

  console.log(`[escalation L2] Trek ${ctx.trekId}: welfare check dispatched`);
}

/**
 * L3: Dispatch to nearby Shikhar Sentinel volunteers.
 * The actual volunteer lookup uses PostGIS ST_DWithin in the TreksService.
 */
export async function sendL3SentinelDispatch(ctx: EscalationContext): Promise<void> {
  console.log(
    `[escalation L3] Trek ${ctx.trekId}: Sentinel dispatch triggered at ` +
    `${ctx.lastKnownLat},${ctx.lastKnownLng}`,
  );
  // TODO Phase 4: push to nearby Sentinels via FCM topic based on geo-hash.
}

/**
 * L3-MMRCC: Notify the Maharashtra Mountaineers Rescue Coordination Centre (7620-230-231)
 * when the trek is in the Maharashtra/Konkan/Sahyadri region.
 * Called in parallel with the Sentinel dispatch at L3.
 */
export async function sendL3MmrccAlert(ctx: EscalationContext): Promise<void> {
  const contact = getMmrccContact(ctx.trailRegion);
  if (!contact) {
    console.log(`[escalation L3-MMRCC] Trek ${ctx.trekId}: trail region "${ctx.trailRegion}" is outside Maharashtra — MMRCC not notified`);
    return;
  }

  const locationStr = ctx.lastKnownLat
    ? `Last GPS: ${ctx.lastKnownLat.toFixed(4)},${ctx.lastKnownLng?.toFixed(4)}`
    : 'Last GPS unavailable';

  const message =
    `[Shikhar RESCUE ALERT] Trekker ${ctx.userName} on ${ctx.trailName ?? 'unknown trail'} ` +
    `has not responded since planned end. ${locationStr}. ` +
    `Live track: ${ctx.liveTrackUrl}. Trek ID: ${ctx.trekId}`;

  console.log(`[escalation L3-MMRCC] Notifying ${contact.org} (${contact.phone}) for trek ${ctx.trekId}`);
  await sendSms(contact.phone, message);

  // Also attempt a voice call to MMRCC via Exotel if configured.
  if (process.env.EXOTEL_API_KEY) {
    try {
      await sendVoiceCall(contact.phone, ctx.userName);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[escalation L3-MMRCC] Voice call to MMRCC failed: ${errMsg}`);
    }
  } else {
    console.log(`[escalation L3-MMRCC DEV] Would call MMRCC ${contact.phone} for trek ${ctx.trekId}`);
  }
}

/**
 * L4: Authority escalation — ERSS-112 dispatch (if user consented).
 * This is irreversible once called. Guard with consent flag.
 */
export async function sendL4AuthorityEscalation(ctx: EscalationContext): Promise<void> {
  if (!ctx.erss112Consent) {
    console.log(`[escalation L4] Trek ${ctx.trekId}: L4 reached but ERSS-112 consent NOT given — stopping at L3 heavy notification`);
    // Send the heaviest possible non-authority notification.
    for (const contact of ctx.emergencyContacts) {
      await sendSms(
        contact.phone,
        `[Shikhar EMERGENCY] ${ctx.userName} has been unreachable for 6+ hours. ` +
        `Please contact local emergency services (112). Last known location: ` +
        `${ctx.lastKnownLat?.toFixed(4)},${ctx.lastKnownLng?.toFixed(4)}`,
      );
    }
    return;
  }

  console.log(`[escalation L4] Trek ${ctx.trekId}: ERSS-112 dispatch initiated`);

  // In production: call the C-DAC/ERSS-112 authenticated API endpoint.
  // Until MoU is signed, fall back to auto-dialing 112 from Exotel with a pre-recorded
  // message carrying GPS, trail name, and permit info.
  if (process.env.EXOTEL_API_KEY) {
    try {
      await axios.post(
        `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect`,
        {
          From: process.env.EXOTEL_CALLER_ID,
          To: '112',
          CallerId: process.env.EXOTEL_CALLER_ID,
          StatusCallback: `${process.env.API_BASE_URL}/api/v1/treks/${ctx.trekId}/erss-callback`,
        },
        {
          auth: {
            username: process.env.EXOTEL_API_KEY!,
            password: process.env.EXOTEL_API_TOKEN!,
          },
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[escalation L4] Exotel call to 112 failed: ${message}`);
    }
  } else {
    console.log(`[escalation L4 DEV] Would auto-dial 112 for trek ${ctx.trekId}`);
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function sendSms(phone: string, message: string): Promise<void> {
  if (!process.env.MSG91_API_KEY) {
    console.log(`[SMS DEV] To: ${phone} | ${message}`);
    return;
  }
  await axios.post(
    'https://api.msg91.com/api/sendhttp.php',
    null,
    {
      params: {
        authkey: process.env.MSG91_API_KEY,
        mobiles: phone.replace('+', ''),
        message,
        sender: 'SHIKHR',
        route: 4, // transactional
      },
    },
  );
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!process.env.GUPSHUP_API_KEY) {
    console.log(`[WA DEV] To: ${phone} | ${message}`);
    return;
  }
  await axios.post(
    'https://api.gupshup.io/sm/api/v1/msg',
    new URLSearchParams({
      channel: 'whatsapp',
      source: process.env.GUPSHUP_SOURCE_PHONE!,
      destination: phone.replace('+', ''),
      message: JSON.stringify({ type: 'text', text: message }),
      'src.name': process.env.GUPSHUP_APP_NAME!,
    }).toString(),
    { headers: { apikey: process.env.GUPSHUP_API_KEY } },
  );
}

async function sendVoiceCall(phone: string, trekkerName: string): Promise<void> {
  if (!process.env.EXOTEL_API_KEY) {
    console.log(`[VOICE DEV] Calling: ${phone} about ${trekkerName}`);
    return;
  }
  await axios.post(
    `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect`,
    new URLSearchParams({
      From: phone.replace('+', ''),
      To: phone.replace('+', ''),
      CallerId: process.env.EXOTEL_CALLER_ID!,
      Url: `${process.env.API_BASE_URL}/api/v1/treks/ivr-welfare-check?name=${encodeURIComponent(trekkerName)}`,
    }).toString(),
    {
      auth: {
        username: process.env.EXOTEL_API_KEY!,
        password: process.env.EXOTEL_API_TOKEN!,
      },
    },
  );
}
