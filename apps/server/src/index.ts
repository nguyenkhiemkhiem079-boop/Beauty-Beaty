import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Set up storage for uploaded files
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

export interface Job {
  id: string;
  ownershipToken: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'BLOCKED' | 'NOT_IMPLEMENTED';
  resultUrl?: string;
  tool: string;
  filePath?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export type JobProcessor = (job: Job, filePath: string) => Promise<{ resultUrl: string }>;

export const jobs = new Map<string, Job>();
export const processors = new Map<string, JobProcessor>();

export function registerProcessor(tool: string, processor: JobProcessor) {
  processors.set(tool, processor);
}

export function unregisterProcessor(tool: string) {
  processors.delete(tool);
}

export function hasProcessorFor(tool: string): boolean {
  return processors.has(tool);
}

const hasAiProviderConfigured = () => Boolean(process.env.MEITU_API_KEY || process.env.AI_PROVIDER_KEY);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB max bounded upload

const fileFilter: multer.Options['fileFilter'] = (req, _file, cb) => {
  const tool = req.body?.tool || 'unknown';
  // Do not store files to disk if AI provider is not configured or no real processor is registered
  if (!hasAiProviderConfigured() || !hasProcessorFor(tool)) {
    return cb(null, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  }
});

// Capability endpoint: advertises configured providers and constraints without exposing secrets
app.get('/api/capabilities', (_req, res) => {
  res.json({
    providerConfigured: hasAiProviderConfigured(),
    registeredProcessors: Array.from(processors.keys()),
    maxUploadBytes: MAX_UPLOAD_BYTES,
    supportedTools: ['ai_enhance', 'ai_makeup']
  });
});

app.post('/api/jobs', upload.single('image'), (req, res) => {
  const tool = req.body?.tool || 'unknown';
  const file = req.file;

  const cleanupFile = () => {
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error removing unwanted upload file:', err);
      }
    }
  };

  if (!hasAiProviderConfigured()) {
    cleanupFile();
    return res.status(503).json({
      status: 'BLOCKED',
      error: 'BLOCKED: Missing AI Provider API Key (Meitu API). AI cloud jobs are blocked until credentials are provided.'
    });
  }

  // Reject readiness if no actual processor is registered for this tool
  if (!hasProcessorFor(tool)) {
    cleanupFile();
    return res.status(501).json({
      status: 'NOT_IMPLEMENTED',
      error: `NOT_IMPLEMENTED: No active processor/worker registered for tool "${tool}". Job cannot be accepted into hanging pending queue.`
    });
  }

  if (!file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const jobId = uuidv4();
  const ownershipToken = uuidv4();
  const job: Job = {
    id: jobId,
    ownershipToken,
    status: 'pending',
    tool,
    filePath: file.path,
    createdAt: Date.now()
  };
  jobs.set(jobId, job);

  // Dispatch immediately to registered real processor (No infinite hanging pending jobs)
  const processor = processors.get(tool)!;
  setImmediate(async () => {
    job.status = 'processing';
    try {
      const result = await processor(job, file.path);
      job.status = 'completed';
      job.resultUrl = result.resultUrl;
      job.completedAt = Date.now();
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'Worker processing failed';
      job.completedAt = Date.now();
    }
  });

  res.status(202).json({ jobId, ownershipToken, status: 'pending', tool });
});

// GET /api/jobs/:id - Enforces ownership token check for privacy
app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const clientToken = req.headers['x-ownership-token'] || req.query.token;
  if (!clientToken || clientToken !== job.ownershipToken) {
    return res.status(403).json({
      error: 'FORBIDDEN: Invalid or missing ownership token. Access to job status denied.'
    });
  }

  const { ownershipToken: _, filePath: __, ...safeJob } = job;
  res.json(safeJob);
});

// Private Storage Endpoint: Requires ownership token to access stored/result files
app.get('/api/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const clientToken = req.headers['x-ownership-token'] || req.query.token;
  if (!clientToken) {
    return res.status(403).json({ error: 'FORBIDDEN: Ownership token required to access private storage' });
  }

  // Verify ownership token belongs to a job referencing this file
  let isAuthorized = false;
  for (const job of jobs.values()) {
    if (job.ownershipToken === clientToken) {
      if (job.filePath && path.basename(job.filePath) === filename) {
        isAuthorized = true;
        break;
      }
      if (job.resultUrl && job.resultUrl.includes(filename)) {
        isAuthorized = true;
        break;
      }
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ error: 'FORBIDDEN: Unauthorized access to file. Token mismatch.' });
  }

  res.sendFile(filePath);
});

// Global Error Handler (handles Multer errors like LIMIT_FILE_SIZE)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Payload Too Large: File exceeds 25MB limit' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
  next();
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`DBeaty API Server running on port ${PORT}`);
});

export { app, server };
