const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const FORECAST_FILE = __dirname + '/data/forecast.json';

// GET /api/forecast  → returns the JSON above
app.get('/api/forecast', (req, res) => {
  try {
    const payload = JSON.parse(fs.readFileSync(FORECAST_FILE, 'utf8'));
    res.json({ error: "", message: "success", response: payload });
  } catch (err) {
    console.error('❌ Error reading forecast.json:', err);
    res.status(500).json({ error: "Failed to load forecast.json" });
  }
});

const PORT = 3200;
app.listen(PORT, () => {
  console.log(`✅ Forecast Dummy API running at http://localhost:${PORT}`);
});
