import { Base, Cell, Link, Room } from "../models";
import { BaseData, BaseError, BaseId, BaseSpec, BaseState } from "../models/base";
import { RoomSpec } from "../models/room";
import { Database } from "../storage/database";
import { BaseReconciler } from "./base-reconciler";

describe("BaseReconciler", () => {

  let baseDb: Database<BaseData>;
  let cellDb: Database<Cell>;
  let linkDb: Database<Link>;
  let roomDb: Database<Room>;
  let baseReconciler: BaseReconciler;

  beforeEach(() => {
    baseDb = new Database<BaseData>();
    cellDb = new Database<Cell>();
    linkDb = new Database<Link>();
    roomDb = new Database<Room>();
    baseReconciler = new BaseReconciler({ baseDb, cellDb, linkDb, roomDb, }, () => {});
  })

  function reconcileWithLimitedIterations(baseId: BaseId) {
    const baseData = baseReconciler.reconcile(baseId);
    if (baseData.status.state !== BaseState.READY) {
      throw new Error("The base failed to reconcile on its first attempt.");
    }
  }

  test('If there are not enough cells available, then the base status contains an error.', () => {
    const spec: BaseSpec = {
      cells: [
        [
          {
            usable: true,
          },
        ],
      ],
      links: [],
      rooms: [
        {
          color: "#AB8F2D",
          name: 'storage-0',
          size: 2,
        },
      ],

    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    expect(baseData.status.errors).toMatchObject([
      {
        [BaseError.NOT_ENOUGH_SPACE]: expect.any(String),
      },
    ]);
  });

  test('If all cells are usable in 1x1 base, then all cells will be assigned rooms.', () => {
    const storageRoomName = 'storage-0';
    const spec: BaseSpec = {
      cells: [
        [
          {
            usable: true,
          },
        ],
      ],
      links: [],
      rooms: [
        {
          color: "#920F3A",
          name: storageRoomName,
          size: 1,
        },
      ],
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    const storageId = baseData.status.rooms[baseData.spec.rooms.findIndex((room) => room.name === storageRoomName)].id;
    const cells = baseData.status.cells
      .map((cellStatusRow) => cellStatusRow
        .map((cellStatus) => cellDb.get(cellStatus.id))
      );
    expect(cells).toMatchObject([
      [
        {
          spec: {
            roomName: storageRoomName,
          },
          status: {
            roomId: storageId,
          },
        },
      ],
    ]);
  });

  test('If all cells are unusable in 1x1 base, then the cells will not be assigned rooms.', () => {
    const spec: BaseSpec = {
      cells: [
        [
          {
            usable: false,
          },
        ],
      ],
      links: [],
      rooms: [
        {
          color: "#b8A3cD",
          name: 'storage-0',
          size: 1,
        },
      ],
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    const cells = baseData.status.cells
      .map((cellStatusRow) => cellStatusRow
        .map((cellStatus) => cellDb.get(cellStatus.id))
      );
    expect(cells).toMatchObject([
      [
        {
          spec: expect.not.objectContaining({
            roomName: expect.any(String),
          }),
          status: expect.not.objectContaining({
            roomId: expect.any(String),
          }),
        },
      ],
    ]);

  });

  test('If cells are not explicitly assigned roomIds, then roomIds will be automatically assigned.', () => {
    const kitchen: RoomSpec = {
      color: "#8D2222",
      name: 'kitchen-0',
      size: 2,
    };
    const storage: RoomSpec = {
      color: "#829BD2",
      name: 'storage-0',
      size: 1,
    };
    const spec: BaseSpec = {
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
        kitchen,
        storage,
      ],
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    const cells = baseData.status.cells
      .map((cellStatusRow) => cellStatusRow
        .map((cellStatus) => cellDb.get(cellStatus.id))
      );
    const kitchenId = baseData.status.rooms[baseData.spec.rooms.findIndex((room) => room.name === kitchen.name)].id;
    const storageId = baseData.status.rooms[baseData.spec.rooms.findIndex((room) => room.name === storage.name)].id;
    expect(cells).toMatchObject([
      [
        {
          spec: {
            roomName: kitchen.name,
          },
          status: {
            roomId: kitchenId,
          },
        },
        {
          spec: {
            roomName: kitchen.name,
          },
          status: {
            roomId: kitchenId,
          },
        },
      ],
      [
        {
          spec: {
            roomName: storage.name,
          },
          status: {
            roomId: storageId,
          },
        },
        {
          spec: expect.not.objectContaining({
            roomName: expect.any(String),
          }),
          status: expect.not.objectContaining({
            roomId: expect.any(String),
          }),
        },
      ],
    ]);
  });

  test('If some cells are not usable, then they will not be assigned rooms.', () => {
    const baseSpec: BaseSpec = {
      cells: [
        [
          {
            usable: true,
          },
          {
            usable: false,
          },
        ],
        [
          {
            usable: true,
          },
          {
            usable: false,
          },
        ],
      ],
      links: [],
      rooms: [
        {
          color: "#2BDF8D",
          name: 'storage-0',
          size: 1,
        },
        {
          color: "#180DC2",
          name: 'kitchen-0',
          size: 1,
        },
      ],
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec: baseSpec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    const cells = baseData.status.cells
      .map((cellStatusRow) => cellStatusRow
        .map((cellStatus) => cellDb.get(cellStatus.id))
      );
    expect(cells).toMatchObject([
      [
        expect.objectContaining({
          spec: expect.objectContaining({
            roomName: baseSpec.rooms[0].name,
          }),
          status: expect.objectContaining({
            roomId: expect.any(String),
          }),
        }),
        expect.objectContaining({
          spec: expect.not.objectContaining({
            roomName: expect.any(String),
          }),
          status: expect.not.objectContaining({
            roomId: expect.any(String),
          }),
        }),
      ],
      [
        expect.objectContaining({
          spec: expect.objectContaining({
            roomName: baseSpec.rooms[1].name,
          }),
          status: expect.objectContaining({
            roomId: expect.any(String),
          }),
        }),
        expect.objectContaining({
          spec: expect.not.objectContaining({
            roomName: expect.any(String),
          }),
          status: expect.not.objectContaining({
            roomId: expect.any(String),
          }),
        }),
      ],
    ]);
  });

  test.skip('Can get distance between two cells', () => {
    // const storageRoom = {
    //   color: "#79A2F0",
    //   id: '816f49d3-1c12-4d78-b522-9f9bf5253120',
    //   name: 'storage-0',
    //   size: 2,
    // };
    // const spec: BaseSpec = {
    //   cells: [
    //     [
    //       {
    //         usable: true,
    //       },
    //       {
    //         usable: false,
    //       },
    //     ],
    //     [
    //       {
    //         usable: false,
    //       },

    //       {
    //         usable: true,
    //       },
    //     ],
    //   ],
    //   links: [],
    //   rooms: [
    //     storageRoom,
    //   ],
    // };
    // const base = new Base({ spec });
    // const cell1 = baseDb.get(base.status.cells[1][1].id);
    // const cell2 = baseDb.get(base.status.cells[0][0].id);
    // const distance = base.getDistance(cell1, cell2);
    // expect(distance).toEqual(Math.pow(Math.pow(0 - 1, 2) + Math.pow(0 - 1, 2), 0.5));
  });

  test('Center of mass energy is computed by distance squared with weight 0.5', () => {
    const bedroom: RoomSpec = {
      color: "#29D7CA",
      name: 'bedroom-0',
      size: 1,
    };
    const storage: RoomSpec = {
      color: "#2FD5BB",
      name: 'storage-0',
      size: 1,
    };
    const spec: BaseSpec = {
      cells: [
        [
          {
            usable: true,
          },
          {
            usable: false,
          },
        ],
        [
          {
            usable: false,
          },
          {
            usable: true,
          },
        ],
      ],
      links: [],
      rooms: [
        bedroom,
        storage,
      ],
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    const centerOfMassWeight = 0.5;
    const intraRoomWeight = 2;
    const interRoomWeight = 1;

    const distance = Math.pow(Math.pow(0 - 1, 2) + Math.pow(0 - 1, 2), 0.5);
    const centerOfMassEnergyPerCell = Math.pow(distance, 2);
    const numberOfUsedCells = base.status.cells.flat().filter((cell) => cell.id !== undefined).length;
    if (numberOfUsedCells <= 0) {
      throw new Error(`There were no used cells.`);
    }
    const avgCenterOfMassEnergyPerCell = (centerOfMassEnergyPerCell * numberOfUsedCells) / numberOfUsedCells;
    const centerOfMassEnergy = Math.pow(avgCenterOfMassEnergyPerCell, centerOfMassWeight);
    const intraRoomEnergy = Math.pow(0, intraRoomWeight);
    const interRoomEnergy = Math.pow(0, interRoomWeight);
    const energy = centerOfMassEnergy + intraRoomEnergy + interRoomEnergy;
    expect(baseData.status.energy).toEqual(energy);
  });

  test("If a base is created from existing Room and Cell class instances, then the roomIds in Cells are preserved.", () => {
    const bedroom: RoomSpec = {
      color: "#048a49",
      name: "bedroom 1",
      size: 1,
    };
    const kitchen: RoomSpec = {
      color: "#ff7373",
      name: "kitchen",
      size: 1,
    };
    const storage: RoomSpec = {
      color: "#fc8332",
      name: "storage",
      size: 1,
    };
    const spec: BaseSpec = {
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
          }, {
            usable: false,
          },
          {
            roomName: storage.name,
            usable: true,
          },
        ],
        [
          {
            roomName: kitchen.name,
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
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    expect(baseData.spec.cells[1][2].roomName).toBe(storage.name);
    expect(baseData.spec.cells[2][0].roomName).toBe(kitchen.name);
  });

  test.only("If a base is created from existing Room and Link class instances, then the roomIds in Links are preserved.", () => {
    const bedroom: RoomSpec = {
      color: "#048a49",
      name: "bedroom 1",
      size: 1,
    };
    const kitchen: RoomSpec = {
      color: "#ff7373",
      name: "kitchen",
      size: 1,
    };
    const storage: RoomSpec = {
      color: "#fc8332",
      name: "storage",
      size: 1,
    };
    const spec: BaseSpec = {
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
            roomName: storage.name,
            usable: true,
          },
        ],
        [
          {
            roomName: kitchen.name,
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
    };
    let baseData: Omit<BaseData, 'id'> = {
      metadata: {},
      spec,
      status: {
        cells: [],
        rooms: [],
        links: [],
        energy: 0,
        errors: [],
        state: BaseState.RECONCILING,
      },
    };
    const base = new Base(baseDb.create(baseData));
    reconcileWithLimitedIterations(base.id);
    baseData = baseDb.get(base.id);
    expect(baseData.spec.links[0].roomNames[0]).toBe(kitchen.name);
    expect(baseData.spec.links[0].roomNames[1]).toBe(storage.name);
  });

});
