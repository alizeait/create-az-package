# create-az-package

[![npm version](https://badge.fury.io/js/create-az-package.svg)](https://badge.fury.io/js/create-az-package)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool to scaffold a new TypeScript NPM package with a modern setup.

## Overview

`create-az-package` helps you kickstart your next TypeScript project by
generating a boilerplate with all the necessary tools and configurations. It
sets up a complete development environment so you can focus on writing code.

The generated package includes:

- **pnpm**: Fast, disk space-efficient package manager.
- **tsup**: Simple and fast TypeScript bundler powered by esbuild.
- **Vitest**: A blazing fast unit-test framework powered by Vite.
- **oxlint**: A high-performance linter to catch and prevent errors.
- **Prettier**: An opinionated code formatter for consistent code style.
- **Changesets**: A tool for managing versioning and changelogs.

## Usage

To create a new package, run the following command and follow the interactive
prompts:

```bash
npx create-az-package
```


You can also provide options directly via the command line:

```bash
npx create-az-package --name my-new-package --description "My awesome package"

```

```bash
  Description
    Create a new TypeScript NPM package 

  Usage
    $ create-az-package [name] [options]

  Options
    -n, --name           Package name
    -d, --description    Package description
    --dir                Directory to create the package in
    -v, --version        Displays current version
    -h, --help           Displays this message

```
## Publishing to NPM

To publish packages to NPM, you'll need to create an NPM access token and add it as a secret to your repository.

1.  **Create an NPM access token**: Follow the instructions at
[https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-access-tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-access-tokens)
to create a new token with "Automation" permissions.

2.  **Add the token to your repository**: Add the token as a secret named `NPM_TOKEN` in your repository's settings. This will allow Changesets to publish packages to NPM on your behalf.

3.  **Allow GitHub Actions to create and approve pull requests**: To allow
Changesets to create and approve pull requests, go to
`https://github.com/YOUR_REPOSITORY/settings/actions` and check `Allow GitHub
Actions to create and approve pull requests`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
