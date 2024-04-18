const express = require('express');
const bodyParser = require('body-parser');
const { convertToDockerCompose } = require('./utils/conversionLogic');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const port = 5578;

app.use(bodyParser.text());

// Define the directory to store Dockerfiles
const dockerfilesDir = path.join(__dirname, 'dockerfiles');

// Ensure the directory exists, create it if not
if (!fs.existsSync(dockerfilesDir)) {
    fs.mkdirSync(dockerfilesDir);
}

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

        // Generate Dockerfile content based on the provided PM2 configuration
        const dockerfileContent = generateDockerfile(pm2ConfigString);

        // Set the appropriate headers for file download
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="Dockerfile"');

        // Send the Dockerfile content as response
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

        // Generate Docker Compose content based on the provided PM2 configuration
        const dockerComposeContent = convertToDockerCompose(pm2ConfigString);

        // Set the appropriate headers for file download
        res.setHeader('Content-Type', 'text/yaml');
        res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');

        // Send the Docker Compose content as response
        res.send(dockerComposeContent);
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to generate and download Docker Compose file.');
    }
});

app.get('/download', (req, res) => {
    const pm2ConfigString = req.query.pm2Config;

    try {
        if (!pm2ConfigString) {
            throw new Error('PM2 ecosystem configuration is required.');
        }

        // Generate Dockerfile content based on the provided PM2 configuration
        const dockerfileContent = generateDockerfile(pm2ConfigString);

        // Create a new zip archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level
        });

        // Add the Dockerfile to the archive
        archive.append(dockerfileContent, { name: 'Dockerfile' });

        // Finalize the archive
        archive.finalize();

        // Set the appropriate headers for zip file download
        res.attachment('dockerfiles.zip');

        // Pipe the zip archive to the response stream
        archive.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to generate zip file.');
    }
});

function generateDockerfile(pm2ConfigString) {
    try {
        // Parse the PM2 configuration string as JSON
        const pm2Config = JSON.parse(pm2ConfigString);

        // Ensure the PM2 config is an object with "apps" array property
        if (!pm2Config || !Array.isArray(pm2Config.apps) || pm2Config.apps.length === 0) {
            throw new Error('Invalid PM2 ecosystem configuration.');
        }

        // Get the script path from the first app
        const scriptPath = pm2Config.apps[0].script;

        // Generate Dockerfile content
        const dockerfileContent = `FROM node:latest\nWORKDIR /usr/src/app\nCOPY ${scriptPath} ./\nRUN chmod +x ${scriptPath}\nEXPOSE ${pm2Config.apps[0].port}\nCMD ["node", "${scriptPath}"]`;

        // Return the Dockerfile content
        return dockerfileContent;
    } catch (error) {
        console.error('Error generating Dockerfile:', error.message);
        throw error; // Re-throw the error to be caught by the caller
    }
}

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});