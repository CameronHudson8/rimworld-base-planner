import { Database } from '../storage/database';
import {
  Base,
  BaseData,
  BaseState,
} from './base';

describe('Base', () => {

  let base: BaseData;
  let baseDb: Database<BaseData>;

  beforeEach(() => {
    const bedroom = {
      color: "#000000",
      name: 'bedroom-0',
      size: 1,
    };
    const kitchen = {
      color: "#123456",
      name: 'kitchen-0',
      size: 1,
    };
    const storage = {
      color: "#FFFFFF",
      name: 'storage-0',
      size: 2,
    };
    const baseData = {
      metadata: {},
      spec: {
        cells: [
          [
            {
              usable: true,
            },
            {
              usable: true,
            },
          ],
          [
            {
              usable: true,
            },
            {
              usable: true,
            },
          ],
        ],
        links: [
          {
            roomNames: {
              0: kitchen.name,
              1: storage.name,
            },
          },
        ],
        rooms: [
          bedroom,
          kitchen,
          storage,
        ],
      },
      status: {
        cells: [[]],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.READY,
      },
    };
    baseDb = new Database<BaseData>();
    base = baseDb.create(baseData);
  });

  test('validation works', () => {
    const baseObject = JSON.parse(JSON.stringify(base));
    expect(Base.validate(baseObject)).toBeInstanceOf(Base);
  });

});
