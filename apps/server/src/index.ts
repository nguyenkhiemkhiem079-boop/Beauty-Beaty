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

  // Background processing simulation (Mocking Meitu API)
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'processing';
      
      // Simulate heavy AI work
      setTimeout(() => {
        // Return original image as mock result (since no Meitu key)
        job.status = 'completed';
        job.resultUrl = `/uploads/${file.filename}`;
      }, 3000);
    }
  }, 500);

  res.json({ jobId, status: 'pending' });
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
