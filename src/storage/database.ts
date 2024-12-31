import joi from "joi";
import { BaseState } from "../models/base";
import { NotifyFunc, Publisher, UnsubscribeFunc } from "../events/publisher";
import { LinkOwnerType } from "../models/link";
import { RoomOwnerType } from "../models/room";
import { CellOwnerType } from "../models/cell";
import { StateData } from "../views/base/base-view";

export function schema<T extends { id: string }>(recordSchema: joi.ObjectPropertiesSchema<T>): joi.ObjectSchema<Database<T>> {
  return joi.object<Database<T>, true>({
    records: joi.object<{ id: T }, true>({
      id: recordSchema,
    }),
    // I'm not sure how to handle functions.
    addSubscriber: joi.any().optional(),
    create: joi.any().optional(),
    delete: joi.any().optional(),
    get: joi.any().optional(),
    list: joi.any().optional(),
    put: joi.any().optional(),
    putMany: joi.any().optional(),
    toJSON: joi.any().optional(),
  });
}

export class Database<const T extends { id: string }> implements Publisher<T> {

  records: { [id: string]: T } = {};
  private subscribers: NotifyFunc<T>[] = [];

  constructor(initialRecords?: T[]) {
    if (initialRecords === undefined) {
      return;
    }
    this.putMany(initialRecords);
  }

  addSubscriber(notifyFunc: (update: T) => void): UnsubscribeFunc {
    this.subscribers.push(notifyFunc);
    const unsubscribe = () => this.subscribers = this.subscribers.filter((s) => s !== notifyFunc);
    return unsubscribe;
  }

  delete(id: string): T {
    const deletedRecord = this.get(id);
    delete this.records[id];
    return JSON.parse(JSON.stringify(deletedRecord));
  }

  put(record: T): T {
    this.records[record.id] = JSON.parse(JSON.stringify(record));
    const updatedRecord = JSON.parse(JSON.stringify(record));
    this.subscribers.forEach((notify) => {
      notify(updatedRecord.id);
    });
    return updatedRecord;
  }

  putMany(records: T[]): T[] {
    return records.map((record) => this.put(record));
  }

  create(record: Omit<T, 'id'>): T {
    if ("id" in record) {
      throw new Error(`Record to create already has an id: ${JSON.stringify(record)}.`);
    }
    const completeRecord: T = {
      ...JSON.parse(JSON.stringify(record)),
      id: crypto.randomUUID(),
    };
    this.records[completeRecord.id] = completeRecord;
    const recordWithoutReferences = JSON.parse(JSON.stringify(completeRecord));
    this.subscribers.forEach((notify) => {
      notify(recordWithoutReferences.id);
    });
    return recordWithoutReferences;
  }

  get(id: string): T {
    if (!(id in this.records)) {
      throw new Error(`Record with ID ${id} not found.`);
    }
    return JSON.parse(JSON.stringify(this.records[id]));
  }

  list(filters: ((record: T) => boolean)[] = []): T[] {
    const records: { [id: string]: T } = JSON.parse(JSON.stringify(this.records));
    let recordsArray = Object.values(records);
    for (const filter of filters) {
      recordsArray = recordsArray.filter(filter);
    }
    return recordsArray;
  }

  toJSON() {
    return Object.values(this.records);
  }
}

export const defaultData: StateData = {
  baseDbData: [
    {
      id: "569ab546-ceeb-479b-9b13-1773d806b32f",
      metadata: {},
      spec: {
        cells: [
          [
            {
              usable: false,
            },
            {
              usable: false,
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
              usable: false,
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
              usable: false,
            },
            {
              usable: false,
            },
          ],
        ],
        links: [
          {
            roomNames: {
              0: 'kitchen',
              1: 'storage',
            },
          },
        ],
        rooms: [
          {
            color: "#048a49",
            name: "bedroom 1",
            size: 1,
          },
          {
            color: "#ff7373",
            name: "kitchen",
            size: 1,
          },
          {
            color: "#fc8332",
            name: "storage",
            size: 1,
          },
        ],
      },
      status: {
        cells: [
          [
            {
              id: "e69d13ce-4392-404f-bcbc-b3abdcd05e1a",
            },
            {
              id: "f1aff2f1-b15d-4bae-8674-6a5dfb48437d",
            },
            {
              id: "39801589-6fb1-4b7b-a496-de549b388a26",
            },
          ],
          [
            {
              id: "45093b1d-f5ca-49d1-9e87-33d680ed09f8",
            },
            {
              id: "7d08f30e-9e18-4030-8221-a5dae34d3281",
            },
            {
              id: "9b78f28d-a08c-4f28-9a6f-38a9037669e9",
            },
          ],
          [
            {
              id: "4201f0d2-25f4-4462-bc84-a7784276eff7",
            },
            {
              id: "f09f1971-c6e4-4f66-8cf0-58f73ce9ee14",
            },
            {
              id: "18a44d23-e095-4476-91bb-ff8b9f86b4a8",
            },
          ],
        ],
        rooms: [
          {
            id: "159a3c37-b083-4e30-8f95-3d1a8f7ee007",
          },
          {
            id: "07d1e652-452b-4998-af4f-81b046098d29",
          },
          {
            id: "6e16292f-6ffd-413c-85f4-5ccc32b2c5ae",
          }
        ],
        links: [
          {
            id: "0ca59015-7a53-4d8e-a873-1c1eed99ac48",
          },
        ],
        energy: 5.826,
        errors: [],
        state: BaseState.READY,
      },
    },
  ],
  cellDbData: [
    {
      id: "e69d13ce-4392-404f-bcbc-b3abdcd05e1a",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        usable: false,
      },
      status: {
      },
    },
    {
      id: "f1aff2f1-b15d-4bae-8674-6a5dfb48437d",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        usable: false,
      },
      status: {
      },
    },
    {
      id: "39801589-6fb1-4b7b-a496-de549b388a26",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        roomName: "bedroom 1",
        usable: true,
      },
      status: {
        roomId: "159a3c37-b083-4e30-8f95-3d1a8f7ee007",
      },
    },
    {
      id: "45093b1d-f5ca-49d1-9e87-33d680ed09f8",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        roomName: "kitchen",
        usable: true,
      },
      status: {
        roomId: "07d1e652-452b-4998-af4f-81b046098d29",
      },
    },
    {
      id: "7d08f30e-9e18-4030-8221-a5dae34d3281",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        usable: false,
      },
      status: {
      },
    },
    {
      id: "9b78f28d-a08c-4f28-9a6f-38a9037669e9",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        roomName: "storage",
        usable: true,
      },
      status: {
        roomId: "6e16292f-6ffd-413c-85f4-5ccc32b2c5ae",
      },
    },
    {
      id: "4201f0d2-25f4-4462-bc84-a7784276eff7",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        usable: true,
      },
      status: {
      },
    },
    {
      id: "f09f1971-c6e4-4f66-8cf0-58f73ce9ee14",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        usable: false,
      },
      status: {
      },
    },
    {
      id: "18a44d23-e095-4476-91bb-ff8b9f86b4a8",
      metadata: {
        owner: {
          type: CellOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        usable: false,
      },
      status: {
      },
    },
  ],
  linkDbData: [
    {
      id: "0ca59015-7a53-4d8e-a873-1c1eed99ac48",
      metadata: {
        owner: {
          type: LinkOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        roomNames: {
          0: 'kitchen',
          1: 'storage',
        },
      },
      status: {
        roomIds: {
          0: "07d1e652-452b-4998-af4f-81b046098d29",
          1: "6e16292f-6ffd-413c-85f4-5ccc32b2c5ae",
        },
      }
    },
  ],
  roomDbData: [
    {
      id: "159a3c37-b083-4e30-8f95-3d1a8f7ee007",
      metadata: {
        owner: {
          type: RoomOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        color: "#048a49",
        name: "bedroom 1",
        size: 1,
      },
      status: {},
    },
    {
      id: "07d1e652-452b-4998-af4f-81b046098d29",
      metadata: {
        owner: {
          type: RoomOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        color: "#ff7373",
        name: "kitchen",
        size: 1,
      },
      status: {},
    },
    {
      id: "6e16292f-6ffd-413c-85f4-5ccc32b2c5ae",
      metadata: {
        owner: {
          type: RoomOwnerType.BASE,
          id: "569ab546-ceeb-479b-9b13-1773d806b32f",
        },
      },
      spec: {
        color: "#fc8332",
        name: "storage",
        size: 1,
      },
      status: {},
    },
  ],
};
