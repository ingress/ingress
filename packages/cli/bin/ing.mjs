#!/usr/bin/env node --watch

import fg from 'fast-glob';
import path from 'path';
import { fromGlobalContext } from 'ingress';
import { register } from 'node:module';
import { debuglog } from 'node:util';

const log = debuglog('ing')

const programState = {
  filePattern: process.argv[2],
  typescriptRegistered: false,
}

async function main(program) {
  if (!program.filePattern) {
    console.error('Usage: ing <glob-pattern>');
    process.exit(1);
  }

  const files = await fg(program.filePattern);
  if (!files.length) {
    console.error(`No files found matching pattern: ${program.filePattern}`);
    process.exit(1);
  }

  for (const file of files) {
    log(`Loading ${file}`);
    if (/\.(ts|mts|tsx)$/.test(file) && !program.typescriptRegistered) {
      log('Registering typescript loader');
      register('@swc-node/register/esm', import.meta.url)
      program.typescriptRegistered = true;
    }
    await import(path.resolve(file));
    log(`Loaded ${file}`);
  }

  {
    const app = fromGlobalContext();
    await app.run();
    const port = app.http.server.address()?.port;
    console.log(`Server running on port ${port}`);
  }
}

main(programState).catch(console.error);
