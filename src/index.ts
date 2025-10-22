#!/usr/bin/env node

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sade from 'sade';
import validateNpmPackageName from 'validate-npm-package-name';
import pkg from '../package.json' assert { type: 'json' };
import {
  intro,
  outro,
  text,
  isCancel,
  cancel,
  log,
  tasks,
  note,
} from '@clack/prompts';
import color from 'picocolors';
import { setTimeout } from 'timers/promises';

const execAsync = promisify(execCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, 'templates');

async function exec(command: string, cwd?: string) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout, stderr };
  } catch (error: any) {
    // Enhance error with stdout/stderr for better debugging
    const stdout = error.stdout?.toString() || '';
    const stderr = error.stderr?.toString() || '';
    const output = [stdout, stderr].filter(Boolean).join('\n').trim();

    const enhancedError = new Error(
      `Command failed: ${command}\n${output ? `\nOutput:\n${output}` : ''}`,
    );
    enhancedError.cause = error;
    throw enhancedError;
  }
}

function replaceVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function validatePackageName(name: string): {
  valid: boolean;
  errors: string[];
} {
  const result = validateNpmPackageName(name);

  if (result.validForNewPackages) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  if (result.errors) {
    errors.push(...result.errors);
  }

  if (result.warnings) {
    errors.push(...result.warnings);
  }

  return { valid: false, errors };
}

async function copyTemplate(
  src: string,
  dest: string,
  variables: Record<string, string>,
) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyTemplate(srcPath, destPath, variables);
    } else {
      const content = await fs.readFile(srcPath, 'utf-8');
      const processedContent = replaceVariables(content, variables);
      await fs.writeFile(destPath, processedContent);
    }
  }
}

async function createPackage(
  packageName?: string,
  opts: { name?: string; description?: string; dir?: string } = {},
) {
  console.clear();
  intro(color.inverse(' create-az-package '));

  let finalPackageName: string = packageName || opts.name || '';

  // If no package name provided, prompt for it with validation loop
  if (!finalPackageName) {
    const inputName = await text({
      message: 'What is your package name?',
      validate: (value) => {
        if (!value) {
          return 'Package name is required';
        }
        const validation = validatePackageName(value);
        if (!validation.valid) {
          return validation.errors.join(', ');
        }
      },
    });

    if (isCancel(inputName)) {
      cancel('Operation cancelled');
      return process.exit(0);
    }

    finalPackageName = inputName as string;
  } else {
    // Validate package name provided via CLI
    const validation = validatePackageName(finalPackageName);
    if (!validation.valid) {
      log.error('Invalid package name:');
      validation.errors.forEach((error) => {
        log.error(`  • ${error}`);
      });
      process.exit(1);
    }
  }

  // Prompt for directory if not provided
  let directory = opts.dir;
  if (!directory) {
    const inputDirectory = await text({
      message: 'Where should we create your package?',
      placeholder: '.',
      defaultValue: '.',
    });

    if (isCancel(inputDirectory)) {
      cancel('Operation cancelled');
      return process.exit(0);
    }

    directory = inputDirectory as string;
  }

  // Prompt for description if not provided
  let description = opts.description;
  if (!description) {
    const inputDescription = await text({
      message: 'Package description (optional)',
    });

    if (isCancel(inputDescription)) {
      cancel('Operation cancelled');
      return process.exit(0);
    }

    description = inputDescription as string;
  }

  // Resolve the project path (directory + package name)
  const baseDir = path.resolve(process.cwd(), directory);
  const projectPath = path.join(baseDir, finalPackageName);

  const variables = {
    PACKAGE_NAME: finalPackageName,
    PACKAGE_DESCRIPTION: description || '',
  };

  await tasks([
    {
      title: 'Setting up project structure',
      task: async () => {
        try {
          try {
            await fs.access(projectPath);
            log.error(`Directory ${color.cyan(projectPath)} already exists`);
            process.exit(1);
          } catch {
            // Directory doesn't exist, which is what we want
          }

          await setTimeout(2000);

          await fs.mkdir(projectPath, { recursive: true });
          await copyTemplate(templatesDir, projectPath, variables);
          return 'Project structure created';
        } catch (error: any) {
          log.error(error.message);
          throw error;
        }
      },
    },
    {
      title: 'Installing dependencies via pnpm',
      task: async () => {
        try {
          await exec('corepack enable', projectPath);
          await exec('pnpm install', projectPath);
          return 'Dependencies installed';
        } catch (error: any) {
          log.error(error.message);
          throw error;
        }
      },
    },
    {
      title: 'Initializing git repository',
      task: async () => {
        try {
          await exec('git init -b master', projectPath);
          // Configure git for CI environments that might not have it set
          try {
            const { stdout: existingEmail } = await exec(
              'git config user.email',
              projectPath,
            );
            if (!existingEmail.trim()) {
              await exec('git config user.email "ci@example.com"', projectPath);
            }
          } catch {
            // No email configured, set a default
            await exec('git config user.email "ci@example.com"', projectPath);
          }

          try {
            const { stdout: existingName } = await exec(
              'git config user.name',
              projectPath,
            );
            if (!existingName.trim()) {
              await exec('git config user.name "CI"', projectPath);
            }
          } catch {
            // No name configured, set a default
            await exec('git config user.name "CI"', projectPath);
          }
          await exec('git add .', projectPath);
          await exec('git commit -m "Initial commit"', projectPath);
          await setTimeout(2000);
          return 'Git repository initialized';
        } catch (error: any) {
          log.error(error.message);
          throw error;
        }
      },
    },
  ]);

  const relativePath = path.relative(process.cwd(), projectPath);
  const displayPath = relativePath.split(path.sep).join(path.posix.sep);

  note(
    `${color.cyan(`cd ${displayPath}\n`)}
${color.cyan('pnpm test')}       ${color.dim('# Run tests')}
${color.cyan('pnpm build')}      ${color.dim('# Build the package')}
${color.cyan('pnpm lint')}       ${color.dim('# Lint your code')}
${color.cyan('pnpm format')}     ${color.dim('# Format your code')}

${color.bold('To create a changeset:')}
${color.cyan('pnpm changeset')}  ${color.dim('# Track changes for versioning')}`,
    'Next steps.',
  );

  outro(
    `Problems? ${color.underline(color.cyan('https://github.com/alizeait/create-az-package/issues'))}`,
  );
}

const prog = sade('create-az-package [name]');

prog
  .version(pkg.version)
  .describe('Create NPM package scaffold')
  .option('-n, --name', 'Package name')
  .option('-d, --description', 'Package description')
  .option('--dir', 'Directory to create the package in')
  .action(createPackage);

async function main() {
  try {
    prog.parse(process.argv);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
