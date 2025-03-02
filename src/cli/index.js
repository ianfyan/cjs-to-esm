#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const colors = require('colors/safe');
const yargs = require('yargs')
  .usage('Usage: convert-cjs <file|directory> [options]')
  .demandCommand(1, 'You need to provide at least one file or directory')
  .option('v', {
    alias: 'verbose',
    type: 'boolean',
    describe: 'Show verbose output',
    default: false
  })
  .example([
    ['convert-cjs src/', 'Transform all files in the src directory']
  ])
  .help();

const { argv } = yargs;
const files = argv._.map((file) => path.resolve(file));

// Path to the main transformation (modify if needed)
const transformPath = path.join(__dirname, '..', 'index.js');

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = [
  'jscodeshift',
  '--verbose=2',
  '--parser=babel',
  '--ignore-config=.gitignore',
  '--ignore-pattern=**/node_modules/**',
  '-t', transformPath,
  ...files
];

const child = spawn(cmd, args, { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error(colors.red(`Process exited with code: ${code}`));
    process.exitCode = code;
  } else {
    console.log(colors.green('Transformation complete!'));
  }
});
