import { Cell } from './Cell'

export type Room = {
  name: string;
  size: number;
}

export type BaseOptions = {
  rooms: Room[];
  cells: { usable: boolean }[][];
}

export class NotEnoughSpaceError extends Error {
  constructor(cellsAvailable: number, cellsNeeded: number) {
    const message = `${cellsAvailable} cell(s) are available, but ${cellsNeeded} cell(s) are needed.`;
    super(message);
  }
}

export class Base {
  private rooms: Room[];
  private matrix: Cell[][];
  constructor(options: BaseOptions) {
    const cellsAvailable = options.cells
      .flat()
      .filter((cell) => cell.usable)
      .length;
    const cellsNeeded = options.rooms
      .reduce((sum, room) => sum + room.size, 0);
    if (cellsAvailable < cellsNeeded) {
      throw new NotEnoughSpaceError(cellsAvailable, cellsNeeded);
    }
    this.rooms = options.rooms;
    this.matrix = this.buildMatrix(options.rooms, options.cells);
  }

  getBaseLayout(): Cell[][] {
    return this.matrix;
  }

  // _getEnergy(): number {
  // Compute the energy of cells of the same room name.
  // Convert the space grid to an adjacency list.
  // const adjacencyList = {}[]
  // const roomCells: { [index: string]: { i: number, j: number }[] } = {};
  // for (const [i, row] of Object.entries(this.baseLayout)) {
  //   for (const [j, cell] of Object.entries(row)) {
  //     if (!cell.roomName) {
  //       continue;
  //     }
  //     if (!(cell.roomName in roomCells)) {
  //       roomCells[cell.roomName] = [];
  //     }
  //     roomCells[cell.roomName].push()
  //   }
  // }
  // this.baseLayout.forEach((cell) => {
  //   if (room.size == 0) {
  //     return {
  //       roomName: room.name,
  //       indices: [],
  //     };
  //   }
  // const intraRoomEnergy = Object.entries(this.baseLayout).map(([i, row]) => {
  //   return Object.entries(row).map(([j, cell]) => {
  //     if (!cell.usable) {
  //       return 0;
  //     }
  //     if (!cell.used) {
  //       return 0;
  //     }

  //     const roomRequirement = this.options.rooms.find((room) => room.name === cell.roomName);
  //     if (!roomRequirement) {
  //       throw new Error(`Room ${cell.roomName} has a cell allocated to it, but it does not exist in the list of required room.`);
  //     }
  //     if (roomRequirement.size <= 1) {
  //       return 0;
  //     }

  //     // Use breadth-first-search to find the nearest space of the same room name.
  //     const queue = [];



  //     const exploredSpaces = [];
  //     const distance = 0;


  //     const energy = Math.pow(distance, 2);
  //     return energy;
  //   })
  //     .flat()
  //     .reduce((sum, roomEnergy: number) => sum + roomEnergy, 0);


  //   // TODO: Compute energy of links between rooms.
  //   const interRoomEnergy = 0;

  //   return intraRoomEnergy + interRoomEnergy;
  // }

  private buildMatrix(rooms: Room[], cells: { usable: boolean }[][]): Cell[][] {
    const roomNameList = [];
    for (const room of rooms) {
      for (let i = 0; i < room.size; i += 1) {
        roomNameList.push(room.name);
      }
    }
    // Create Cells with room names
    const matrix: Cell[][] = [];
    for (let i in cells) {
      matrix.push([]);
      for (let j in cells[i]) {
        if (!cells[i][j].usable) {
          matrix[i].push(new Cell({
            coordinates: [Number(i), Number(j)],
            neighbors: [],
            usable: cells[i][j].usable,
            used: false,
          }));
          continue;
        }
        const roomName = roomNameList.shift();
        matrix[i].push(new Cell({
          coordinates: [Number(i), Number(j)],
          neighbors: [],
          roomName,
          usable: cells[i][j].usable,
          used: roomName !== undefined,
        }));
      }
    }
    // Assign neighbors to Cells
    for (let iStr in matrix) {
      for (let jStr in matrix[iStr]) {
        const i = Number(iStr);
        const j = Number(jStr);
        const neighbors = [];
        if (i > 0) {
          neighbors.push(matrix[`${i - 1}`][jStr]);
        }
        if (i < matrix.length - 1) {
          neighbors.push(matrix[`${i + 1}`][jStr]);
        }
        if (j > 0) {
          neighbors.push(matrix[iStr][`${j - 1}`]);
        }
        if (j < matrix[iStr].length - 1) {
          neighbors.push(matrix[iStr][`${j + 1}`]);
        }
        matrix[i][j].neighbors = neighbors;
      }
    }
    return matrix;
  }

}
