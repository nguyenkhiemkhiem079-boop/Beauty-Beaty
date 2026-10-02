import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

// Set up storage for uploaded files
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// In-memory job store (Use SQLite in production)
interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  tool: string;
}
const jobs = new Map<string, Job>();

app.post('/api/jobs', upload.single('image'), (req, res) => {
  const file = req.file;
  const tool = req.body.tool;
  
  if (!file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const jobId = uuidv4();
  
  // Create job
  jobs.set(jobId, {
    id: jobId,
    status: 'pending',
    tool
  });

  // Removed fake timeout mockup
  // This API requires Meitu API keys which are blocked.
  job.status = 'failed';
  jobs.set(jobId, job);
  
  res.json({ jobId, status: 'failed', error: 'BLOCKED: Missing AI Provider API Key' });
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
