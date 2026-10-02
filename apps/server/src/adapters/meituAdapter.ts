import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Job } from '../index';

export interface MeituAdapterConfig {
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  timeoutMs?: number;
}

export const activeControllers = new Map<string, AbortController>();

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Validates input image prior to dispatching to AI provider.
 */
export function validateInputFile(filePath: string): { valid: boolean; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: `Tệp tin không tồn tại: ${filePath}` };
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return { valid: false, error: 'Tệp tin tải lên bị rỗng (0 bytes)' };
  }

  if (stats.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Kích thước tệp tin vượt quá 25MB (${stats.size} bytes)` };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Định dạng tệp không được hỗ trợ: ${ext}. Chỉ chấp nhận .jpg, .png, .webp` };
  }

  return { valid: true };
}

/**
 * Generates an HMAC-SHA256 signature for Meitu Open API request.
 */
export function generateMeituSignature(
  appKey: string,
  appSecret: string,
  timestamp: number,
  params: Record<string, string>
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
  const payload = `app_key=${appKey}&timestamp=${timestamp}&${paramStr}`;
  return crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
}

/**
 * Aborts an active cloud job request by Job ID.
 */
export function cancelActiveJob(jobId: string): boolean {
  const controller = activeControllers.get(jobId);
  if (controller) {
    controller.abort('Job cancelled by client ownership token request');
    activeControllers.delete(jobId);
    return true;
  }
  return false;
}

/**
 * Actual Meitu Cloud AI Provider Adapter implementation.
 */
export async function meituProcessor(job: Job, filePath: string, config?: MeituAdapterConfig): Promise<{ resultUrl: string }> {
  // 1. Validate Input
  const validation = validateInputFile(filePath);
  if (!validation.valid) {
    throw new Error(`VALIDATION_ERROR: ${validation.error}`);
  }

  const apiKey = config?.apiKey || process.env.MEITU_API_KEY;
  const apiSecret = config?.apiSecret || process.env.MEITU_API_SECRET || 'default_secret';
  const apiUrl = config?.apiUrl || process.env.MEITU_API_URL || 'https://openapi.meitu.com/v1/image/process';
  const timeoutMs = config?.timeoutMs || Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000;

  // 2. Credential Check (Explicit BLOCKED_EXTERNAL if credentials are not configured)
  if (!apiKey) {
    throw new Error('BLOCKED_EXTERNAL: Missing MEITU_API_KEY. Cloud AI processing is blocked pending provider credentials.');
  }

  // 3. Setup Cancellation & Timeout AbortController
  const controller = new AbortController();
  activeControllers.set(job.id, controller);
  const timeoutId = setTimeout(() => {
    controller.abort(`TIMEOUT: Meitu provider request exceeded ${timeoutMs}ms timeout threshold`);
  }, timeoutMs);

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      tool: job.tool,
      jobId: job.id
    };
    const signature = generateMeituSignature(apiKey, apiSecret, timestamp, params);

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, path.basename(filePath));
    formData.append('app_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('tool', job.tool);
    formData.append('signature', signature);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`MEITU_API_HTTP_${response.status}: ${errText || response.statusText}`);
    }

    const data: any = await response.json();
    if (data.code && data.code !== 0 && data.code !== 200) {
      throw new Error(`MEITU_API_ERROR_${data.code}: ${data.message || 'Unknown provider error'}`);
    }

    // 4. Validate and download output image
    const resultImageUrl = data.result_url || data.data?.result_url || data.data?.url;
    if (!resultImageUrl && !data.result_base64) {
      throw new Error('OUTPUT_VALIDATION_ERROR: Meitu provider response did not contain result_url or image data');
    }

    const uploadDir = path.dirname(filePath);
    const resultFilename = `result_${job.id}.png`;
    const resultFilePath = path.join(uploadDir, resultFilename);

    if (resultImageUrl) {
      const imgRes = await fetch(resultImageUrl, { signal: controller.signal });
      if (!imgRes.ok) {
        throw new Error(`Failed to download output image from ${resultImageUrl}`);
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(resultFilePath, buffer);
    } else if (data.result_base64) {
      const cleanB64 = data.result_base64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(resultFilePath, Buffer.from(cleanB64, 'base64'));
    }

    return { resultUrl: `/api/files/${resultFilename}` };
  } finally {
    clearTimeout(timeoutId);
    activeControllers.delete(job.id);

    // Clean up temporary upload input file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to clean up temporary upload file:', err);
      }
    }
  }
}
