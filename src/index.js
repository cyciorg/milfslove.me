const express = require('express');
const bodyParser = require('body-parser');
const { convertToDockerCompose, generateDockerfile } = require('./utils/conversionLogic');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const port = 5578;

app.use(bodyParser.text());


// Update the express.static middleware to serve only HTML, CSS, and JavaScript files
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html', 'css', 'js']
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/convert', (req, res) => {
    const pm2ConfigString = req.body;

    try {
        if (!pm2ConfigString) {
            throw new Error('PM2 ecosystem configuration is required.');
        }

        const dockerComposeContent = convertToDockerCompose(pm2ConfigString);
        res.send(dockerComposeContent);
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to convert PM2 ecosystem configuration.');
    }
});

app.get('/download-dockerfile', (req, res) => {
    const pm2ConfigString = req.query.pm2Config;
    try {
        if (!pm2ConfigString) {
            throw new Error('PM2 ecosystem configuration is required.');
        }

        const dockerfileContent = generateDockerfile(pm2ConfigString);

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="Dockerfile"');

        res.send(dockerfileContent);
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to generate and download Dockerfile.');
    }
});

app.get('/download-docker-compose', (req, res) => {
    const pm2ConfigString = req.query.pm2Config;

    try {
        if (!pm2ConfigString) {
            throw new Error('PM2 ecosystem configuration is required.');
        }

        const dockerComposeContent = convertToDockerCompose(pm2ConfigString);

        res.setHeader('Content-Type', 'text/yaml');
        res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');

        res.send(dockerComposeContent);
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to generate and download Docker Compose file.');
    }
});


app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});