const fs = require('fs');

function convertToDockerCompose(pm2ConfigString) {
    try {
        const pm2Config = JSON.parse(pm2ConfigString);

        if (!pm2Config || !pm2Config.apps || !Array.isArray(pm2Config.apps) || pm2Config.apps.length === 0) {
            throw new Error('Invalid PM2 ecosystem configuration.');
        }

        let dockerComposeContent = `services:\n`;

        pm2Config.apps.forEach((app, index) => {
            const serviceName = `${app.name}${index + 1}`;

            dockerComposeContent += `  ${serviceName}:\n`;
            dockerComposeContent += `    image: node:latest\n`;
            dockerComposeContent += `    container_name: ${app.name}\n`
            if (app.env) {
                dockerComposeContent += `    environment:\n`;
                Object.entries(app.env).forEach(([key, value]) => {
                    dockerComposeContent += `      - ${key}=${value}\n`;
                });
            }

            if (app.ports) {
                dockerComposeContent += `    ports:\n`;
                app.ports.forEach(port => {
                    dockerComposeContent += `      - "${port}"\n`;
                });
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

            if (app.healthcheck) {
                dockerComposeContent += `    healthcheck:\n`;
                dockerComposeContent += `      test: ${app.healthcheck}\n`;
            }

            if (app.command) {
                dockerComposeContent += `    command: ${app.command}\n`;
            }

            if (app.working_dir) {
                dockerComposeContent += `    working_dir: ${app.working_dir}\n`;
            }

            if (app.build) {
                dockerComposeContent += `    build:\n`;
                dockerComposeContent += `      context: .\n`;
                dockerComposeContent += `      dockerfile: ./Dockerfile\n`;
            }

            if (app.cap_add) {
                dockerComposeContent += `    cap_add:\n`;
                app.cap_add.forEach(capability => {
                    dockerComposeContent += `      - ${capability}\n`;
                });
            }

            if (app.cap_drop) {
                dockerComposeContent += `    cap_drop:\n`;
                app.cap_drop.forEach(capability => {
                    dockerComposeContent += `      - ${capability}\n`;
                });
            }

            if (app.devices) {
                dockerComposeContent += `    devices:\n`;
                app.devices.forEach(device => {
                    dockerComposeContent += `      - ${device}\n`;
                });
            }

            if (app.sysctls) {
                dockerComposeContent += `    sysctls:\n`;
                Object.entries(app.sysctls).forEach(([key, value]) => {
                    dockerComposeContent += `      ${key}: ${value}\n`;
                });
            }

            if (app.extra_hosts) {
                dockerComposeContent += `    extra_hosts:\n`;
                app.extra_hosts.forEach(host => {
                    dockerComposeContent += `      - ${host}\n`;
                });
            }

            if (app.user) {
                dockerComposeContent += `    user: ${app.user}\n`;
            }

            if (app.labels) {
                dockerComposeContent += `    labels:\n`;
                Object.entries(app.labels).forEach(([key, value]) => {
                    dockerComposeContent += `      ${key}: ${value}\n`;
                });
            }

            if (app.environment_file) {
                dockerComposeContent += `    env_file: ${app.environment_file}\n`;
            }

            if (app.tmpfs) {
                dockerComposeContent += `    tmpfs:\n`;
                app.tmpfs.forEach(tmpfs => {
                    dockerComposeContent += `      - ${tmpfs}\n`;
                });
            }

            if (app.secrets) {
                dockerComposeContent += `    secrets:\n`;
                app.secrets.forEach(secret => {
                    dockerComposeContent += `      - ${secret}\n`;
                });
            }

            dockerComposeContent += '\n';
        });

        return dockerComposeContent;
    } catch (error) {
        console.error('Error converting PM2 ecosystem configuration:', error.message);
        throw new Error('Failed to convert PM2 ecosystem configuration.');
    }
}

function generateDockerfile(pm2ConfigString) {
    try {
        const pm2Config = JSON.parse(pm2ConfigString);

        if (!pm2Config || !pm2Config.apps || !Array.isArray(pm2Config.apps) || pm2Config.apps.length === 0) {
            throw new Error('Invalid PM2 ecosystem configuration.');
        }
        
        let dockerfileContent = '';
        
        dockerfileContent += `# Stage 1: Install Dependencies\n`;
        dockerfileContent += `FROM node:latest AS builder\n`;
        dockerfileContent += `WORKDIR /usr/src/app\n`;
        
        dockerfileContent += `COPY package*.json ./\n`;
        dockerfileContent += `RUN npm install --production\n`;
        
        pm2Config.apps.forEach((app, index) => {
            const scriptPath = app.script;
            dockerfileContent += `COPY ${scriptPath} ./${index + 1}/\n`;
            dockerfileContent += `RUN chmod +x ./${index + 1}/${scriptPath}\n`;
        });
        
        dockerfileContent += `\n# Stage 2: Runtime\n`;
        dockerfileContent += `FROM node:alpine\n`;
        dockerfileContent += `WORKDIR /usr/src/app\n`;
        
        pm2Config.apps.forEach((app, index) => {
            dockerfileContent += `COPY --from=builder /usr/src/app/${index + 1} ./\n`;
        });
        
        const ports = pm2Config.apps.flatMap(app => app.port ? [app.port] : []);
        if (ports.length > 0) {
            dockerfileContent += `EXPOSE ${ports.join(' ')}\n`;
        }
        
        pm2Config.apps.forEach(app => {
            Object.entries(app.env).forEach(([key, value]) => {
                dockerfileContent += `ENV ${key}=${value}\n`;
            });
        });
        
        dockerfileContent += `HEALTHCHECK --interval=30s --timeout=10s CMD curl --fail http://localhost:${ports[0]}/|| exit 1\n`;

        dockerfileContent += `USER node\n`;

        dockerfileContent += `CMD ["node", "${pm2Config.apps[0].script}"]\n`;

        return dockerfileContent;
    } catch (error) {
        console.error('Error generating Dockerfile:', error.message);
        throw error;
    }
}

module.exports = {
    convertToDockerCompose,
    generateDockerfile
};