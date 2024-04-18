const fs = require('fs');

function convertToDockerCompose(pm2ConfigString) {
    try {
        console.log('PM2 Configuration String:', pm2ConfigString); // Debugging: Log the PM2 configuration string

        // Parse the PM2 configuration string as JSON
        const pm2Config = JSON.parse(pm2ConfigString);

        console.log('Parsed PM2 Configuration:', pm2Config); // Debugging: Log the parsed PM2 configuration object

        // Validate the parsed PM2 configuration
        if (!pm2Config || !pm2Config.apps || !Array.isArray(pm2Config.apps) || pm2Config.apps.length === 0) {
            throw new Error('Invalid PM2 ecosystem configuration.');
        }

        let dockerComposeContent = `version: '3'\nservices:\n`;

        pm2Config.apps.forEach((app, index) => {
            const serviceName = `app${index + 1}`;

            dockerComposeContent += `  ${serviceName}:\n`;
            dockerComposeContent += `    image: ${app.script}_image\n`;

            if (app.env) {
                dockerComposeContent += `    environment:\n`;
                Object.entries(app.env).forEach(([key, value]) => {
                    dockerComposeContent += `      - ${key}=${value}\n`;
                });
            }

            if (app.port) {
                dockerComposeContent += `    ports:\n`;
                dockerComposeContent += `      - "${app.port}:${app.port}"\n`;
            }

            if (app.volumes) {
                dockerComposeContent += `    volumes:\n`;
                app.volumes.forEach(volume => {
                    dockerComposeContent += `      - ${volume}\n`;
                });
            }

            if (app.networks) {
                dockerComposeContent += `    networks:\n`;
                app.networks.forEach(network => {
                    dockerComposeContent += `      - ${network}\n`;
                });
            }

            if (app.depends_on) {
                dockerComposeContent += `    depends_on:\n`;
                app.depends_on.forEach(dependency => {
                    dockerComposeContent += `      - ${dependency}\n`;
                });
            }

            if (app.restart_policy) {
                dockerComposeContent += `    restart: ${app.restart_policy}\n`;
            }

            if (app.health_check) {
                dockerComposeContent += `    healthcheck:\n`;
                dockerComposeContent += `      test: ${app.health_check}\n`;
            }

            if (app.command) {
                dockerComposeContent += `    command: ${app.command}\n`;
            }

            if (app.working_dir) {
                dockerComposeContent += `    working_dir: ${app.working_dir}\n`;
            }

            if (app.build) {
                dockerComposeContent += `    build: ${app.build}\n`;
            }

            dockerComposeContent += '\n';
        });

        // Generate Dockerfile based on the first application script provided
        if (pm2Config.apps[0] && pm2Config.apps[0].script) {
            const dockerfilePath = 'Dockerfile';
            const scriptPath = pm2Config.apps[0].script;
            const dockerfileContent = `FROM node:latest\nWORKDIR /usr/src/app\nCOPY ${scriptPath} ./\nRUN chmod +x ${scriptPath}\nEXPOSE ${pm2Config.apps[0].port}\nCMD ["node", "${scriptPath}"]`;
            fs.writeFileSync(dockerfilePath, dockerfileContent);
            console.log(`Dockerfile created at ${dockerfilePath}`);
        }

        return dockerComposeContent;
    } catch (error) {
        console.error('Error converting PM2 ecosystem configuration:', error.message);
        throw new Error('Failed to convert PM2 ecosystem configuration.');
    }
}

module.exports = {
    convertToDockerCompose
};