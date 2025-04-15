#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, '../templates');
const currentDir = process.cwd();

async function init() {
    console.log(`\n🚀 Welcome to Starter Kit!`);

    const { projectName, contractFramework, frontendFramework } = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Enter your project name:',
            default: 'my-web3-app',
            validate: input => !!input.trim() || 'Project name cannot be empty.'
        },
        {
            type: 'list',
            name: 'contractFramework',
            message: 'Choose a smart contract framework:',
            choices: ['foundry', 'hardhat'],
        },
        {
            type: 'list',
            name: 'frontendFramework',
            message: 'Choose a frontend framework:',
            choices: ['NEXT', 'VITE'],
        }
    ]);

    const projectPath = path.join(currentDir, projectName);
    if (fs.existsSync(projectPath)) {
        console.log("\n❌ Error: Directory already exists!");
        process.exit(1);
    }

    fs.mkdirSync(projectPath);
    console.log("\n📦 Setting up project...");

    // Copy contracts
    fs.copySync(path.join(templatesDir, 'contracts', contractFramework), path.join(projectPath, 'contracts'));

    // Copy frontend
    fs.copySync(path.join(templatesDir, 'frontend', frontendFramework), path.join(projectPath, 'frontend'));

    console.log("\n✅ Project setup complete!");
    console.log(`\n👉 cd ${projectName} && code .`);
}

init();
