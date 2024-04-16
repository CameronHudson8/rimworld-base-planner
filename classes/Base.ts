import { Cell } from 'classes/Cell';
import { logger } from 'tools/logger';

export type Room = {
  links: { name: string }[];
  name: string;
  size: number;
}

export type BaseOptions = {
  rooms: Room[];
  cells: { usable: boolean }[][];
}

export type BaseLayoutOptimizationOptions = {
  iterations: number;
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
    this._validateRoomSizes(options.rooms);
    this._validateSpaceAvailable(options.rooms, options.cells);
    this._validateRoomUniqueness(options.rooms);
    this._validateLinkReciprocity(options.rooms);

    this.rooms = options.rooms;
    this.matrix = this._buildMatrix(options.rooms, options.cells);
  }

  getBaseLayout(): Cell[][] {
    return this.matrix;
  }

  optimizeBaseLayout({ iterations }: BaseLayoutOptimizationOptions = { iterations: 100000 }): Cell[][] {

    let currentMatrix = this.matrix;
    let currentEnergy = this._getEnergy(currentMatrix);

    let globalMinimumMatrix = this.matrix;
    let globalMinimumEnergy = Infinity;

    for (let i = 0; i < iterations; i += 1) {
      // Create a near-clone of based on the existing matrix.
      const candidateMatrix = this._cloneBaseLayout(currentMatrix);
      // Swap the room assignments of 2 cells in candidateMatrix (ONLY their roomNames).
      const usableCells = candidateMatrix
        .flat()
        .filter((cell) => cell.usable);
      const cell1 = usableCells[Math.floor(Math.random() * usableCells.length)];
      const cellsInOtherRooms = usableCells.filter((cell) => cell.roomName !== cell1.roomName);
      const cell2 = cellsInOtherRooms[Math.floor(Math.random() * cellsInOtherRooms.length)];
      const cell1RoomName = cell1.roomName;
      const cell1Used = cell1.used;
      const cell2RoomName = cell2.roomName;
      const cell2Used = cell2.used;
      cell2.roomName = cell1RoomName;
      cell2.used = cell1Used;
      cell1.roomName = cell2RoomName;
      cell1.used = cell2Used;

      const candidateEnergy = this._getEnergy(candidateMatrix);
      const acceptanceProbabilityThreshold = (1 - i / iterations);

      if (candidateEnergy < currentEnergy) {
        logger.debug(`Energy decreased from ${currentEnergy} to ${candidateEnergy}.`);
        currentMatrix = candidateMatrix;
        currentEnergy = candidateEnergy;
        if (currentEnergy < globalMinimumEnergy) {
          globalMinimumMatrix = candidateMatrix;
          globalMinimumEnergy = candidateEnergy;
        }
      } else if (candidateEnergy > currentEnergy && Math.random() < acceptanceProbabilityThreshold) {
        logger.debug(`Energy increased from ${currentEnergy} to ${candidateEnergy} (probability ${acceptanceProbabilityThreshold}).`);
        this.matrix = candidateMatrix;
        currentEnergy = candidateEnergy;
      }
    }

    logger.debug(`Global minimum energy = ${globalMinimumEnergy}.`);
    this.matrix = globalMinimumMatrix
    return this.matrix;
  }

  _cloneBaseLayout(originalMatrix: Cell[][]): Cell[][] {
    const matrix = originalMatrix.map((row) => {
      return row.map((cell) => new Cell({
        coordinates: [...cell.coordinates],
        id: cell.id,
        neighbors: [],
        roomName: cell.roomName,
        usable: cell.usable,
        used: cell.used,
      }));
    });
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

  _getEnergy(matrix: Cell[][]): number {
    const cells = matrix.flat();

    let intraRoomConnections = 0;
    const intraRoomEnergy = cells
      .map((cell) => {
        if (!cell.roomName) {
          return 0;
        }
        const sameRoomCells = cells.filter((otherCell) => {
          return otherCell.id !== cell.id && otherCell.roomName === cell.roomName;
        });
        const energy = sameRoomCells
          .map((sameRoomCell) => cell.getDistanceTo(sameRoomCell))
          .map((distance) => Math.pow(distance, 2))
          .reduce((sum, energy) => sum + energy, 0);

        intraRoomConnections += sameRoomCells.length;
        return energy;
      })
      .reduce((sum, energy) => sum + energy, 0);

    let interRoomConnections = 0;
    const interRoomEnergy = cells
      .map((cell) => {
        if (!cell.roomName) {
          return 0;
        }
        const linkedRoomNames = this.rooms
          .filter((room) => room.name === cell.roomName)
          .map((room) => room.links)
          .flat()
          .map((link) => link.name);
        const linkedRoomCells = cells.filter((otherCell) => {
          return linkedRoomNames.includes(otherCell.roomName || '');
        });
        const energy = linkedRoomCells
          .map((linkedRoomCell) => cell.getDistanceTo(linkedRoomCell))
          .map((distance) => Math.pow(distance, 2))
          .reduce((sum, energy) => sum + energy, 0);
        interRoomConnections += linkedRoomCells.length;
        return energy;
      })
      .reduce((sum, energy) => sum + energy, 0);

    // Give equal weight to the intraRoomEnergy and the interRoomEnergy.
    return intraRoomEnergy / intraRoomConnections + interRoomEnergy / interRoomConnections;
  }

  _buildMatrix(rooms: Room[], cells: { usable: boolean }[][]): Cell[][] {
    const roomNameList = [];
    for (const room of rooms) {
      for (let i = 0; i < room.size; i += 1) {
        roomNameList.push(room.name);
      }
    }
    // Create Cells with room names
    const neighborlessMatrix: Cell[][] = [];
    for (let i in cells) {
      neighborlessMatrix.push([]);
      for (let j in cells[i]) {
        if (!cells[i][j].usable) {
          neighborlessMatrix[i].push(new Cell({
            coordinates: [Number(i), Number(j)],
            neighbors: [],
            usable: cells[i][j].usable,
            used: false,
          }));
          continue;
        }

        const roomName = roomNameList
          .splice(Math.floor(Math.random() * roomNameList.length), 1)
          .shift();
        neighborlessMatrix[i].push(new Cell({
          coordinates: [Number(i), Number(j)],
          neighbors: [],
          roomName: roomName,
          usable: cells[i][j].usable,
          used: roomName !== undefined,
        }));
      }
    }

    const matrix = this._cloneBaseLayout(neighborlessMatrix);
    return matrix;
  }

  _validateRoomSizes(rooms: Room[]) {
    for (const room of rooms) {
      if (room.size < 1) {
        throw new Error(`Room with name '${room.name}' has room size '${room.size}', but the minimum room size is 1.`);
      }
    }
  }

  _validateRoomUniqueness(rooms: Room[]) {
    const uniqueRoomNames = new Set();
    for (const room of rooms) {
      if (uniqueRoomNames.has(room.name)) {
        throw new Error(`Multiple rooms have the name '${room.name}'.`);
      }
      uniqueRoomNames.add(room.name);
    }
  }

  _validateLinkReciprocity(rooms: Room[]) {
    for (const room of rooms) {
      for (const link of room.links) {
        const linkedRoom = rooms.find((room) => room.name === link.name);
        if (linkedRoom === undefined) {
          throw new Error(`Room with name '${room.name}' has a link to a room with name '${link.name}', but there is no such room.`);
        }
        const reciprocalLink = linkedRoom.links.find((link) => link.name === room.name);
        if (reciprocalLink === undefined) {
          throw new Error(`Room with name '${room.name}' has a link to room with name ${linkedRoom.name}, but room with name '${linkedRoom.name}' does not have a link back to room with name '${room.name}'.`);
        }
      }
    }
  }

  _validateSpaceAvailable(rooms: Room[], cells: { usable: boolean }[][]) {
    const cellsAvailable = cells
      .flat()
      .filter((cell) => cell.usable)
      .length;
    const cellsNeeded = rooms
      .reduce((sum, room) => sum + room.size, 0);
    if (cellsAvailable < cellsNeeded) {
      throw new NotEnoughSpaceError(cellsAvailable, cellsNeeded);
    }
  }

}
