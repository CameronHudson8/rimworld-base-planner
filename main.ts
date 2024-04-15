import fs from 'fs/promises';

import yaml from 'js-yaml';

import {
  Base,
  BaseOptions
} from "./classes/Base";
import { Cell } from './classes/Cell';

async function main() {
  const filename = 'the-legua-covenant.yaml'
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
