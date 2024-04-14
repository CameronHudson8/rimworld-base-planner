import { logger } from './logger';

export type RoomRequirements = {
  name: string;
  size: number;
}

export type BaseRequirements = {
  roomRequirements: RoomRequirements[];
  spaceAvailable: Cell[][];
}

export type Cell = {
  roomName?: string;
  usable: boolean;
  used?: boolean;
}

export type BaseLayout = {
  baseLayout: Cell[][];
}

export class NotEnoughSpaceError extends Error {
  constructor(cellsAvailable: number, cellsNeeded: number) {
    const message = `${cellsAvailable} cell(s) are available, but ${cellsNeeded} cell(s) are needed.`;
    super(message);
  }
}

export class Base {
  baseLayout?: BaseLayout;
  constructor(private requirements: BaseRequirements) {
    const cellsAvailable = this.requirements.spaceAvailable
      .flat()
      .filter((cell) => cell.usable)
      .length;
    const cellsNeeded = this.requirements.roomRequirements
      .reduce((sum, room) => sum + room.size, 0);
    if (cellsAvailable < cellsNeeded) {
      throw new NotEnoughSpaceError(cellsAvailable, cellsNeeded);
    }
  }

  getBaseLayout(): BaseLayout {
    if (this.baseLayout != undefined) {
      return this.baseLayout
    }
    const baseLayout = this._getBaseLayoutNaive();
    this.baseLayout = baseLayout;
    return this.baseLayout;
  }

  _getBaseLayoutNaive(): BaseLayout {
    const baseLayout = [];
    let roomIndex = 0;
    let roomSizeCount = 0;
    for (const row of this.requirements.spaceAvailable) {
      const baseLayoutRow: Cell[] = [];
      baseLayout.push(baseLayoutRow);
      for (const cell of row) {
        if (!cell.usable) {
          baseLayoutRow.push({
            ...cell,
            used: false,
          });
          continue;
        }

        if (roomIndex > this.requirements.roomRequirements.length - 1) {
          baseLayoutRow.push({
            ...cell,
            used: false,
          });
          continue;
        }

        while ((roomIndex <= this.requirements.roomRequirements.length - 1) && (roomSizeCount >= this.requirements.roomRequirements[roomIndex].size)) {
          roomIndex += 1;
          roomSizeCount = 0;
        }
        if (roomIndex > this.requirements.roomRequirements.length - 1) {
          baseLayoutRow.push({
            ...cell,
            used: false,
          });
          continue;
        }

        baseLayoutRow.push({
          ...cell,
          roomName: this.requirements.roomRequirements[roomIndex].name,
          used: true,
        });
        roomSizeCount += 1;
      }
    }
    return { baseLayout };
  }

  getBaseRequirements(): BaseRequirements {
    return this.requirements;
  }
}
