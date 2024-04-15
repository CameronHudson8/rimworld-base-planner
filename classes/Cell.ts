export type CellOptions = {
  id?: string;
  neighbors: Cell[];
  roomName?: string;
  usable: boolean;
  used?: boolean;
}

export class Cell {
  id: string;
  neighbors: Cell[];
  roomName?: string;
  usable: boolean
  used?: boolean;
  constructor(options: CellOptions) {
    this.id = options.id ?? crypto.randomUUID();
    this.neighbors = options.neighbors ?? [];
    this.roomName = options.roomName;
    this.usable = options.usable;
    this.used = options.used;
  }
  getDistanceToNearest(findFunction: (cell: Cell) => boolean): number {
    // Breadth first search
    const metadata: {
      [index: string]: {
        explored: boolean;
        parent?: Cell;
      }
    } = {};
    metadata[this.id] = {
      explored: true,
    };
    const queue: Cell[] = [this];
    for (let cell = queue.shift(); cell !== undefined; cell = queue.shift()) {
      if (!cell) {
        throw new Error("Somehow queue.shift() returned undefined even though the queue was not empty.");
      }
      if ((cell.id !== this.id) && findFunction(cell)) {
        let distance = 0;
        while (cell !== undefined && metadata[cell.id].parent !== undefined) {
          cell = metadata[cell.id].parent;
          distance += 1;
        }
        return distance;
      }
      for (const neighbor of cell.neighbors) {
        if (!(neighbor.id in metadata) || !metadata[neighbor.id].explored) {
          metadata[neighbor.id] = {
            explored: true,
            parent: cell,
          };
          queue.push(neighbor);
        }
      }
    }
    throw new Error("Breadth-first search was unable to find the desired cell.");
  }
  isUsable(): boolean {
    return this.usable;
  }
  toJSON(): string {
    const safeObject = {
      ...this,
      neighbors: undefined,
    };
    return safeObject;
  }
}
