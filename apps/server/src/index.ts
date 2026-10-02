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
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

// In-memory job store (Use SQLite in production)
interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'BLOCKED' | 'NOT_IMPLEMENTED';
  resultUrl?: string;
  tool: string;
  error?: string;
}
const jobs = new Map<string, Job>();

const hasAiProviderConfigured = () => Boolean(process.env.MEITU_API_KEY || process.env.AI_PROVIDER_KEY);
const isAiAdapterImplemented = () => Boolean(process.env.ENABLE_AI_WORKER === 'true');

const fileFilter: multer.Options['fileFilter'] = (_req, _file, cb) => {
  // Do not store files to disk if AI provider is not configured or adapter not implemented
  if (!hasAiProviderConfigured() || !isAiAdapterImplemented()) {
    return cb(null, false);
  }
  cb(null, true);
};
const upload = multer({ storage, fileFilter });

app.post('/api/jobs', upload.single('image'), (req, res) => {
  const cleanupFile = () => {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
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

  if (!isAiAdapterImplemented()) {
    cleanupFile();
    return res.status(501).json({
      status: 'NOT_IMPLEMENTED',
      error: 'NOT_IMPLEMENTED: AI Provider worker/adapter is not implemented yet. Job cannot be accepted or processed.'
    });
  }

  const file = req.file;
  const tool = req.body?.tool || 'unknown';
  
  if (!file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const jobId = uuidv4();
  const job: Job = {
    id: jobId,
    status: 'pending',
    tool
  };
  jobs.set(jobId, job);

  res.status(202).json({ jobId, status: 'pending', tool });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Serve processed images statically
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DBeaty API Server running on port ${PORT}`);
});
