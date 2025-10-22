import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const tempDir = path.join(os.tmpdir(), 'create-az-package-test');
const cliPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
const packageName = 'my-test-package';
const packageDir = path.join(tempDir, packageName);

const templateFiles = [
  '.gitignore',
  '.nvmrc',
  '.prettierignore',
  '.prettierrc',
  'package.json',
  'pnpm-workspace.yaml',
  'README.md',
  'tsconfig.json',
  'tsup.config.ts',
  'vitest.config.ts',
  'src/index.ts',
  'src/__tests__/index.test.ts',
  '.changeset/config.json',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.vscode/extensions.json',
];

describe('create-az-package', () => {
  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });

    execSync(
      `node ${cliPath} --name ${packageName} --description "Test description" --dir .`,
      {
        cwd: tempDir,
      },
    );
  }, 30000);

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create the package directory', () => {
    expect(fs.existsSync(packageDir)).toBe(true);
  });

  it('should create all template files', () => {
    for (const file of templateFiles) {
      const filePath = path.join(packageDir, file);
      expect(fs.existsSync(filePath), `File ${file} should exist`).toBe(true);
    }
  });

  it('should initialize git repository with master branch', () => {
    expect(fs.existsSync(path.join(packageDir, '.git'))).toBe(true);

    const currentBranch = execSync('git branch --show-current', {
      cwd: packageDir,
      encoding: 'utf-8',
    }).trim();
    expect(currentBranch).toBe('master');
  });

  it('should have an initial commit', () => {
    const commitCount = execSync('git rev-list --count HEAD', {
      cwd: packageDir,
      encoding: 'utf-8',
    }).trim();
    expect(parseInt(commitCount)).toBeGreaterThan(0);
  });

  it('should build successfully', () => {
    expect(() => {
      execSync('pnpm build', { cwd: packageDir, stdio: 'inherit' });
    }).not.toThrow();
  }, 30000);

  it('should pass all tests', () => {
    expect(() => {
      execSync('pnpm test', { cwd: packageDir, stdio: 'inherit' });
    }).not.toThrow();
  }, 30000);
});
