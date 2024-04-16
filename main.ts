import fs from 'fs/promises';

import yaml from 'js-yaml';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import {
  Base,
  BaseOptions
} from "classes/Base";
import { Cell } from 'classes/Cell';
import { logger } from 'tools/logger';

async function main() {

  const args = yargs(hideBin(process.argv))
    .option('config', {
      description: 'A config file. See the readme for an example.',
      required: true,
      type: 'string',
    })
    .parseSync();

  const filename = args.config;
  const fileContent = await fs.readFile(filename, 'utf-8');
  const baseOptions = yaml.load(fileContent) as BaseOptions;
  const base = new Base(baseOptions);
  const baseLayout = base.optimizeBaseLayout();
  const baseLayoutYaml = yaml.dump(baseLayout, {
    replacer: (key, value) => {
      return value instanceof Cell
        ? {
          ...value,
          neighbors: undefined,
        }
        : value;
    }
  });
  console.log(baseLayoutYaml);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
