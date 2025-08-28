const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

router.get('/forecast', async (req, res) => {
    try {
        const pythonProcess = spawn('python', ['forecast.py']);
        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            try {
                const forecastData = JSON.parse(dataString);
                res.json(forecastData);
            } catch (error) {
                res.status(500).json({ error: 'Error parsing forecast data' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error generating forecast' });
    }
});

router.post('/forecast/adjust', async (req, res) => {
    try {
        const { price_adjustment, advertising_adjustment } = req.body;
        
        const pythonProcess = spawn('python', [
            'forecast.py',
            '--adjust',
            '--price', price_adjustment.toString(),
            '--advertising', advertising_adjustment.toString()
        ]);

        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            try {
                const adjustedForecast = JSON.parse(dataString);
                res.json(adjustedForecast);
            } catch (error) {
                res.status(500).json({ error: 'Error parsing adjusted forecast data' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error adjusting forecast' });
    }
});

module.exports = router;
