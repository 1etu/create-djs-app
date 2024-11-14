#!/usr/bin/env node

/*
 * This project is licensed under the terms that it is not for sale or republish.
 * It is free to use for personal and educational purposes.
 * 
 * Created by etulastrada (Ege Türker)
 */

/**
 * @fileoverview Create Discord App CLI - A tool to bootstrap Discord.js bot projects
 * with support for JavaScript and TypeScript.
 */

import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';crea
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} ProjectAnswers
 * @property {string} [projectName] - Name of the project
 * @property {'JavaScript' | 'TypeScript'} language - Programming language choice
 * @property {boolean} useSlashCommands - Whether to include slash commands support
 */

/**
 * @typedef {Object} ProjectStructure
 * @property {Object.<string, ProjectStructure>} [key: string] - Nested directory structure
 */

/**
 * Creates the project directory structure recursively
 * @param {string} targetDir - The target directory path
 * @param {ProjectStructure} structure - The directory structure to create
 * @param {string} [currentPath=''] - Current path in the recursive operation
 * @returns {Promise<void>}
 */
async function createProjectStructure(targetDir, structure, currentPath = '') {
  for (const [key, value] of Object.entries(structure)) {
    const fullPath = path.join(targetDir, currentPath, key);
    await fs.ensureDir(fullPath);
    if (Object.keys(value).length > 0) {
      await createProjectStructure(targetDir, value, path.join(currentPath, key));
    }
  }
}

/**
 * Creates initial bot files including event handlers and utility functions
 * @param {string} targetDir - The target directory path
 * @param {ProjectAnswers} answers - User's choices from inquirer
 * @returns {Promise<void>}
 */
async function createInitialBotFiles(targetDir, answers) {
  const fileExt = answers.language === 'TypeScript' ? '.ts' : '.js';
  
  const loggerContent = `${answers.language === 'TypeScript' ? 'type LogLevel = "info" | "warn" | "error";\n\n' : ''}
export const logger = {
  info: (message${answers.language === 'TypeScript' ? ': string' : ''}) => console.log(\`[INFO] \${message}\`),
  warn: (message${answers.language === 'TypeScript' ? ': string' : ''}) => console.warn(\`[WARN] \${message}\`),
  error: (message${answers.language === 'TypeScript' ? ': string' : ''}) => console.error(\`[ERROR] \${message}\`)
};`;
  
  await fs.writeFile(path.join(targetDir, `src/utils/logger${fileExt}`), loggerContent);

  const readyContent = `${answers.language === 'TypeScript' ? 'import { Client } from "discord.js";\n' : ''}import { logger } from '../utils/logger${fileExt}';

export default {
  name: 'ready',
  once: true,
  ${answers.language === 'TypeScript' ? 'execute(client: Client): void {' : 'execute(client) {'}
    logger.info(\`Logged in as \${client.user.tag}!\`);
  },
};`;

  await fs.writeFile(path.join(targetDir, `src/events/ready${fileExt}`), readyContent);

  if (answers.useSlashCommands) {
    const interactionContent = `${answers.language === 'TypeScript' ? 'import { Interaction } from "discord.js";\n' : ''}
import { logger } from '../utils/logger${fileExt}';

export default {
  name: 'interactionCreate',
  ${answers.language === 'TypeScript' ? 'async execute(interaction: Interaction): Promise<void> {' : 'async execute(interaction) {'}
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const command = interaction.client.commands.get(commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(\`Error executing \${commandName}\`);
      console.error(error);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
};`;

    await fs.writeFile(path.join(targetDir, `src/events/interactionCreate${fileExt}`), interactionContent);
  }
}

/**
 * Creates all necessary template files for the project
 * @param {string} targetDir - The target directory path
 * @param {ProjectAnswers} answers - User's choices from inquirer
 * @returns {Promise<void>}
 */
async function createTemplateFiles(targetDir, answers) {
  const packageJson = {
    name: path.basename(targetDir),
    version: '1.0.0',
    description: 'A Discord bot created with create-discord-app',
    main: answers.language === 'TypeScript' ? 'dist/index.js' : 'src/index.js',
    scripts: {
      start: answers.language === 'TypeScript' ? 'node dist/index.js' : 'node src/index.js',
      dev: answers.language === 'TypeScript' ? 'ts-node src/index.ts' : 'nodemon src/index.js',
      ...(answers.language === 'TypeScript' ? { build: 'tsc' } : {})
    },
    dependencies: {
      'discord.js': '^14.11.0',
      'dotenv': '^16.3.1'
    },
    devDependencies: {
      'nodemon': '^3.0.1',
      ...(answers.language === 'TypeScript' ? {
        '@types/node': '^20.4.5',
        'typescript': '^5.1.6',
        'ts-node': '^10.9.1'
      } : {})
    }
  };

  await fs.writeJSON(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });


  const mainFile = answers.language === 'TypeScript' ? 'src/index.ts' : 'src/index.js';
  const mainContent = generateMainContent(answers);
  await fs.writeFile(path.join(targetDir, mainFile), mainContent);

  await fs.writeFile(path.join(targetDir, '.env'), 'BOT_TOKEN=your-bot-token-here');
  await fs.writeFile(path.join(targetDir, '.gitignore'), 'node_modules/\n.env\ndist/\n');
  await fs.writeFile(path.join(targetDir, 'README.md'), generateReadmeContent(targetDir, answers));

  if (answers.language === 'TypeScript') {
    await createTypeScriptConfig(targetDir);
  }

  await createExampleCommand(targetDir, answers);
  await createInitialBotFiles(targetDir, answers);
}

/**
 * Creates TypeScript configuration file
 * @param {string} targetDir - The target directory path
 * @returns {Promise<void>}
 */
async function createTypeScriptConfig(targetDir) {
  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
  };

  await fs.writeJSON(path.join(targetDir, 'tsconfig.json'), tsConfig, { spaces: 2 });
}


/**
 * Creates an example command file
 * @param {string} targetDir - The target directory path
 * @param {ProjectAnswers} answers - User's choices from inquirer
 * @returns {Promise<void>}
 */
async function createExampleCommand(targetDir, answers) {
  const commandsDir = path.join(targetDir, 'src/commands');
  const commandFileExt = answers.language === 'TypeScript' ? '.ts' : '.js';
  const pingCommandContent = `${answers.language === 'TypeScript' ? "import { CommandInteraction } from 'discord.js';" : '// No imports needed for JavaScript'}

${answers.language === 'TypeScript' ? 'export default {' : 'module.exports = {'}
  name: 'ping',
  description: 'Replies with Pong!',
  ${answers.language === 'TypeScript' ? 'async execute(interaction: CommandInteraction) {' : 'async execute(interaction) {'}
    await interaction.reply('Pong!');
  },
};`;
  await fs.writeFile(path.join(commandsDir, `ping${commandFileExt}`), pingCommandContent);
}

/**
 * Generates README content
 * @param {string} targetDir - The target directory path
 * @param {ProjectAnswers} answers - User's choices from inquirer
 * @returns {string} The content for the README file
 */
function generateReadmeContent(targetDir, answers) {
  return `# ${path.basename(targetDir)}

A Discord bot created with create-discord-app

## Getting Started

1. Clone this repository
2. Run \`npm install\`
3. Create a \`.env\` file and add your bot token:
   \`\`\`
   TOKEN=your-bot-token-here
   \`\`\`
4. Run \`npm start\` to start the bot

## Features

- Discord.js v14
- ${answers.language} support
- Organized project structure
- Environment variables support
${answers.useSlashCommands ? '- Slash commands support' : ''}
`;
}


/**
 * Generates the main bot file content
 * @param {ProjectAnswers} answers - User's choices from inquirer
 * @returns {string} The content for the main bot file
 */
function generateMainContent(answers) {
  const fileExt = answers.language === 'TypeScript' ? '.ts' : '.js';
  return `${answers.language === 'TypeScript' ? 'import { Client, Collection, GatewayIntentBits } from "discord.js";\n' : 'import { Client, Collection, GatewayIntentBits } from "discord.js";\n'}
import { readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { logger } from './utils/logger${fileExt}';

dotenv.config();

${answers.language === 'TypeScript' ? 'declare module "discord.js" {\n  export interface Client {\n    commands: Collection<string, any>;\n  }\n}\n\n' : ''}
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('${fileExt}'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  import(filePath).then((command) => {
    if ('default' in command && 'execute' in command.default) {
      client.commands.set(command.default.name, command.default);
      logger.info(\`Loaded command: \${command.default.name}\`);
    }
  });
}

// Load events
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('${fileExt}'));

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  import(filePath).then((event) => {
    if ('default' in event) {
      if (event.default.once) {
        client.once(event.default.name, (...args) => event.default.execute(...args));
      } else {
        client.on(event.default.name, (...args) => event.default.execute(...args));
      }
      logger.info(\`Loaded event: \${event.default.name}\`);
    }
  });
}

client.login(process.env.TOKEN);`;
}

program
  .name('create-discord-app')
  .description('Bootstrap a Discord.js bot project')
  .argument('[project-directory]', 'Project directory name')
  .action(async (projectName) => {
    /** @type {ProjectAnswers} */
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'What is your project named?',
        default: projectName || 'my-discord-bot',
        when: !projectName
      },
      {
        type: 'list',
        name: 'language',
        message: 'Which language would you like to use?',
        choices: ['JavaScript', 'TypeScript']
      },
      {
        type: 'confirm',
        name: 'useSlashCommands',
        message: 'Would you like to include slash commands support?',
        default: true
      }
    ]);

    projectName = projectName || answers.projectName;
    const targetDir = path.join(process.cwd(), projectName);

    try {
      /** @type {ProjectStructure} */
      const structure = {
        'src/': {
          'commands/': {},
          'events/': {},
          'utils/': {}
        },
        'config/': {}
      };

      await createProjectStructure(targetDir, structure);
      await createTemplateFiles(targetDir, answers);

      console.log(chalk.green('\nSuccess! Created', projectName, 'at', targetDir));
      console.log('\nInside that directory, you can run several commands:');
      console.log(chalk.cyan('\n  npm start'));
      console.log('    Starts the development server.');
      if (answers.language === 'TypeScript') {
        console.log(chalk.cyan('\n  npm run build'));
        console.log('    Builds the app for production.');
      }
      console.log('\nWe suggest that you begin by typing:');
      console.log(chalk.cyan('\n  cd'), projectName);
      console.log(chalk.cyan('  npm install'));
      console.log(chalk.cyan('  npm start'));
    } catch (err) {
      console.error(chalk.red('Error creating project:'), err);
      process.exit(1);
    }
  });

program.parse();