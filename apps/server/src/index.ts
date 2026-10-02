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
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'BLOCKED';
  resultUrl?: string;
  tool: string;
  error?: string;
}
const jobs = new Map<string, Job>();

const hasAiProviderConfigured = () => Boolean(process.env.MEITU_API_KEY || process.env.AI_PROVIDER_KEY);

const fileFilter: multer.Options['fileFilter'] = (_req, _file, cb) => {
  // Do not store files to disk if AI provider is not configured
  if (!hasAiProviderConfigured()) {
    return cb(null, false);
  }
  cb(null, true);
};
const upload = multer({ storage, fileFilter });

app.post('/api/jobs', upload.single('image'), (req, res) => {
  if (!hasAiProviderConfigured()) {
    // Avoid saving uploaded files to disk when provider is missing
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error removing unwanted upload file:', err);
      }
    }
    return res.status(503).json({
      status: 'BLOCKED',
      error: 'BLOCKED: Missing AI Provider API Key (Meitu API). AI cloud jobs are blocked until credentials are provided.'
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

// Endpoint to store verified test artifact outputs and visual evidence
app.post('/api/save-test-artifacts', express.json({ limit: '50mb' }), (req, res) => {
  const { artifacts } = req.body;
  if (!artifacts || !Array.isArray(artifacts)) {
    return res.status(400).json({ error: 'No artifacts provided' });
  }
  const artifactsDir = path.join(__dirname, '../../../docs/test_artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  const savedFiles: string[] = [];
  for (const item of artifacts) {
    const { filename, base64Data } = item;
    if (filename && base64Data) {
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const filePath = path.join(artifactsDir, filename);
      fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
      savedFiles.push(filename);
    }
  }
  res.json({ success: true, count: savedFiles.length, files: savedFiles });
});

// Serve processed images statically
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DBeaty API Server running on port ${PORT}`);
});
