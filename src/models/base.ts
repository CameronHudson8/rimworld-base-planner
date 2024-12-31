import joi from "joi";
import { CellId, specSchema as cellSpecSchema, CellSpec } from "./cell";
import { LinkId, specSchema as linkSpecSchema, LinkSpec } from "./link";
import { RoomId, specSchema as roomSpecSchema, RoomSpec, RoomName } from "./room";

export type GetEnergyOptions = {
  centerOfMassWeight?: number,
  interRoomWeight?: number,
  intraRoomWeight?: number,
};

export type BaseId = string;

export type BaseMetadata = object;

export interface BaseSpec {
  cells: CellSpec[][],
  links: LinkSpec[],
  rooms: RoomSpec[],
};

export interface BaseStatus {
  cells: {
    id: CellId,
  }[][],
  rooms: {
    id: RoomId,
  }[],
  links: {
    id: LinkId,
  }[],
  energy: number,
  errors: { [key in keyof typeof BaseError]?: string }[],
  state: BaseState,
};

export interface BaseData {
  id: BaseId,
  metadata: BaseMetadata,
  spec: BaseSpec,
  status: BaseStatus,
};

export const metadataSchema = joi.object<BaseMetadata, true>({});

export const specSchema = joi.object<BaseSpec, true>({
  cells: joi.array<CellSpec[][]>().items(
    joi.array<CellSpec[]>().items(
      cellSpecSchema,
    ),
  ),
  links: joi.array<LinkSpec[]>().items(
    linkSpecSchema.concat(joi.object<LinkSpec, true>({
      roomNames: joi.object<{ 0: RoomName, 1: RoomName }, true>({
        0: joi.string().allow(joi.in('.....rooms', { adjust: (roomSpec: RoomSpec) => roomSpec.name })),
        1: joi.string().allow(joi.in('.....rooms', { adjust: (roomSpec: RoomSpec) => roomSpec.name })),
      }),
    })),
  ),
  rooms: joi.array<RoomSpec[]>().items(
    roomSpecSchema,
  ),
})
  .custom((root: BaseSpec) => {
    if (!root.cells.every((cellRow) => cellRow.length === root.cells.length)) {
      throw new Error("The grid of cells must be square.");
    }
    return root;
  });

export enum BaseState {
  READY = 'READY',
  RECONCILING = 'RECONCILING',
}

export enum BaseError {
  NOT_ENOUGH_SPACE = 'NOT_ENOUGH_SPACE',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  TOO_MANY_CELLS_FOR_ROOM = 'TOO_MANY_CELLS_FOR_ROOM',
  UNUSABLE_CELL_WITH_ROOM_NAME = 'UNUSABLE_CELL_WITH_ROOM_NAME',
}
export function notEnoughSpaceError(cellsAvailable: number, cellsNeeded: number): { [key in keyof typeof BaseError]?: string } {
  return { [BaseError.NOT_ENOUGH_SPACE]: `${cellsAvailable} cell(s) are available, but ${cellsNeeded} cell(s) are needed.` };
}
export function roomNotFoundError(message: string): { [key in keyof typeof BaseError]?: string } {
  return { [BaseError.ROOM_NOT_FOUND]: message };
}
export function tooManyCellsForRoom(roomName: RoomName, roomSize: number, cellCount: number): { [key in keyof typeof BaseError]?: string } {
  return { [BaseError.TOO_MANY_CELLS_FOR_ROOM]: `The room named '${roomName}' should have '${roomSize}' cells assigned to it, but it has '${cellCount}' cells assigned ot it.` };
}
export function unusableCellWithRoomName(coordinates: [i: number, j: number], roomName: string) {
  const [i, j] = coordinates;
  return { [BaseError.UNUSABLE_CELL_WITH_ROOM_NAME]: `The cell at coordinates [${i}, ${j}] is unusable, but it was also assigned the room name '${roomName}'.` };
}

export const statusSchema = joi.object<BaseStatus, true>({
  cells: joi.array<{ id: CellId, roomId?: RoomId }[][]>()
    .custom((cellStatusRows: { id: CellId }[][]) => {
      const cellIdCounts: { [id: CellId]: number } = {};
      for (const cellStatusRow of cellStatusRows) {
        for (const cellStatus of cellStatusRow) {
          if (cellStatus.id in cellIdCounts) {
            throw new Error(`A base's status refers to cell id ${cellStatus.id} more than once.`);
          }
          cellIdCounts[cellStatus.id] = 1;
        }
      }
      return cellStatusRows;
    })
    .items(
      joi.array<{ id: CellId, roomId?: RoomId }[]>().items(
        joi.object<{ id: CellId, roomId?: RoomId }, true>({
          id: joi.string(),
          roomId: joi.string().optional().valid(joi.ref('status.rooms', { adjust: (room: { id: RoomId }) => room.id })),
        }),
      ),
    ),
  rooms: joi.array<{ id: RoomId }[]>().items(
    joi.object<{ id: RoomId }, true>({
      id: joi.string(),
    }),
  ),
  links: joi.array<{ id: LinkId }[]>().items(
    joi.object<{ id: LinkId }, true>({
      id: joi.string(),
    }),
  ),
  energy: joi.number().min(0),
  errors: joi.array<{ [key in keyof typeof BaseError]?: string }[]>().items(
    joi.alternatives(...Object.values(BaseError).map((baseError) => joi.object<{ [key in keyof typeof BaseError]?: string }>({
      [baseError]: joi.string(),
    }))),
  ),
  state: joi.string().allow(...Object.values(BaseState)),
});

export const schema = joi.object<BaseData, true>({
  id: joi.string(),
  metadata: metadataSchema,
  spec: specSchema,
  status: statusSchema.optional(),
});

export class Base implements BaseData {

  readonly id: string;
  readonly metadata = {};
  readonly spec: BaseSpec;
  readonly status: BaseStatus;

  // The constructor does not preserve any references that are passed in.
  constructor({ id, spec: baseSpec, status: baseStatus }: { id: BaseId, spec: BaseSpec, status?: BaseStatus }) {
    this.id = id;
    this.spec = Base.validateSpec(baseSpec);

    this.status = baseStatus === undefined ? {
      cells: [],
      links: [],
      rooms: [],
      energy: 0,
      errors: [],
      state: BaseState.RECONCILING,
    } : Base.validateStatus(baseStatus);

  }

  addLink(roomNames: { 0: RoomName, 1: RoomName }): Base {
    if (this.spec.rooms.find((room) => room.name === roomNames[0]) === undefined) {
      throw new Error(`Can't create link between rooms with ids '${roomNames[0]}' and '${roomNames[1]}' because there is no room with name '${roomNames[0]}'.`);
    }
    if (this.spec.rooms.find((room) => room.name === roomNames[1]) === undefined) {
      throw new Error(`Can't create link between rooms with ids '${roomNames[0]}' and '${roomNames[1]}' because there is no room with name '${roomNames[1]}'.`);
    }
    this.spec.links.push({ roomNames });
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  addRoom(roomSpec: RoomSpec): Base {
    this.spec.rooms.push(roomSpec);
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  deleteLink(index: number): Base {
    this.spec.links = [
      ...this.spec.links.slice(0, index),
      ...this.spec.links.slice(index + 1),
    ];
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  deleteRoom(index: number): Base {
    this.spec.rooms = [
      ...this.spec.rooms.slice(0, index),
      ...this.spec.rooms.slice(index + 1),
    ];
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  setCellUsability(coordinates: { 0: number, 1: number }, usable: boolean): Base {
    if (coordinates[0] < 0) {
      throw new Error(`Cannot set usabilty of cell at x position '${coordinates[0]}', because ${coordinates[0]} is less than 0.`)
    }
    if (coordinates[0] > this.spec.cells.length - 1) {
      throw new Error(`Cannot set usabilty of cell at x position '${coordinates[0]}', because the maximum x position is '${this.spec.cells.length - 1}.'`)
    }
    if (coordinates[1] < 0) {
      throw new Error(`Cannot set usabilty of cell at y position '${coordinates[1]}', because ${coordinates[1]} is less than 0.`)
    }
    if (coordinates[1] > this.spec.cells[0].length - 1) {
      throw new Error(`Cannot set usabilty of cell at y position '${coordinates[1]}', because the maximum y position is '${this.spec.cells[1].length - 1}.'`)
    }

    this.spec.cells[coordinates[0]][coordinates[1]].usable = usable;
    delete this.spec.cells[coordinates[0]][coordinates[1]].roomName;
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  setLinkRoomNames(index: number, roomNames: { 0: RoomName; 1: RoomName; }): Base {
    this.spec.links[index].roomNames = roomNames;
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  setRoomColor(index: number, newRoomColor: string): Base {
    this.spec.rooms[index].color = newRoomColor;
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  setRoomName(index: number, newRoomName: string): Base {
    this.spec.rooms[index].name = newRoomName;
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  setRoomSize(index: number, newRoomSize: number): Base {
    this.spec.rooms[index].size = newRoomSize;
    this.status.state = BaseState.RECONCILING;
    return this;
  }

  setSize(newSize: number, generateCellSpec: () => CellSpec, generateCellStatus: () => { id: CellId }): Base {
    this.spec.cells = Base.resizeGrid(this.spec.cells, newSize, generateCellSpec);
    this.status.cells = Base.resizeGrid(this.status.cells, newSize, generateCellStatus);
    return this;
  }

  // This accepts an unknown variable, performs validation, and returns a class instance.
  // It does not preserve references to any objects or sub-objects that are passed in.
  static validate(existingBase: unknown): Base {
    const { error, value } = schema.validate(existingBase);
    if (error !== undefined) {
      throw error;
    }
    const base = new Base(value);
    return base;
  }

  // This accepts an unknown variable, performs validation, and returns a spec.
  // It does not preserve references to any objects or sub-objects that are passed in.
  static validateSpec(existingBaseSpec: unknown): BaseSpec {
    const { error, value } = specSchema.validate(existingBaseSpec);
    if (error !== undefined) {
      throw error;
    }
    return value;
  }

  // This accepts an unknown variable, performs validation, and returns a status.
  // It does not preserve references to any objects or sub-objects that are passed in.
  static validateStatus(existingBaseStatus: unknown): BaseStatus {
    const { error, value } = statusSchema.validate(existingBaseStatus);
    if (error !== undefined) {
      throw error;
    }
    return value;
  }

  private static resizeGrid<T>(grid: T[][], newSize: number, generateDefaultValue: () => T): T[][] {
    /**
     * If the current grid is too SMALL:
     *   If the current size is EVEN,
     *     then add a row on the BOTTOM and a column on the LEFT.
     *   If the current size is ODD,
     *     then add a row on the TOP and a column on the RIGHT.
     * If the current grid is too BIG:
     *   If the current size is EVEN,
     *     then remove a row from the TOP and a column from the RIGHT.
     *   If the current size is ODD,
     *     then remove a row from the BOTTOM and a column from the LEFT.
     */

    // Decreasing grid size
    while (grid.length > newSize) {
      if (grid.length % 2 === 0) {
        // Remove a row from the top.
        grid.shift();
      } else {
        // Remove a row from the bottom.
        grid.pop();
      }
      for (let i = 0; i < grid.length; i += 1) {
        while (grid[i].length > newSize) {
          if (grid[i].length % 2 === 0) {
            // Remove a column from the right.
            grid[i].pop();
          } else {
            // Remove a column from the left.
            grid[i].shift();
          }
        }
      }
    }
    // Increasing grid size
    while (grid.length < newSize) {
      if (grid.length % 2 === 0) {
        // Add a row to the bottom.
        grid.push([]);
      } else {
        // Add a row to the top.
        grid.unshift([]);
      }
      for (let i = 0; i < grid.length; i += 1) {
        while (grid[i].length < newSize) {
          if (grid[i].length % 2 === 0) {
            // Add a column on the left.
            grid[i].unshift(generateDefaultValue());
          } else {
            // Add a column on the right.
            grid[i].push(generateDefaultValue());
          }
        }
      }
    }
    return grid;
  }

};

export function clone(base: BaseData): BaseData {
  return {
    id: base.id,
    metadata: {},
    spec: {
      cells: base.spec.cells.map((baseSpecCellRow) => baseSpecCellRow.map((baseSpecCell) => ({
        usable: baseSpecCell.usable,
        ...("roomName" in baseSpecCell ? { roomName: baseSpecCell.roomName } : {}),
      }))),
      links: base.spec.links.map((baseSpecLink) => ({
        roomNames: {
          0: baseSpecLink.roomNames[0],
          1: baseSpecLink.roomNames[1],
        }
      })),
      rooms: base.spec.rooms.map((baseSpecRoom) => ({
        name: baseSpecRoom.name,
        color: baseSpecRoom.color,
        size: baseSpecRoom.size,
      })),
    },
    status: {
      cells: base.status.cells.map((baseStatusCellRow) => baseStatusCellRow.map((baseStatusCell) => ({
        id: baseStatusCell.id,
      }))),
      rooms: base.status.rooms.map((baseStatusRoom) => ({
        id: baseStatusRoom.id,
      })),
      links: base.status.links.map((baseStatusLink) => ({
        id: baseStatusLink.id,
      })),
      energy: base.status.energy,
      errors: base.status.errors.map((error) => Object.entries(error)).map(([key, value]) => ({
        [String(key)]: value,
      })).flat(),
      state: base.status.state,
    }
  };
}
