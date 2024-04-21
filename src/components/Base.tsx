import React from "react";
import './Base.css';

import { Cell, CellProps } from './Cell';
import { RoomProps } from './Room';

export type BaseProps = {
  rooms: RoomProps[];
}

export type BaseState = {
  cellProps: CellProps[][];
  isOptimizing: boolean;
  size: number;
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

export class Base extends React.Component<BaseProps, BaseState> {
  constructor(props: BaseProps) {
    super(props);
    const initialSize = 7;

    const existingBaseStatesString = localStorage.getItem('baseState');
    const existingBaseState: BaseState = existingBaseStatesString
      ? JSON.parse(existingBaseStatesString)
      : undefined;
    if (existingBaseState) {
      this.state = {
        ...existingBaseState,
        isOptimizing: false,
        size: initialSize,
      };
    } else {
      this.state = {
        cellProps: this._assignInitialRooms(this._buildCellProps(initialSize)),
        isOptimizing: false,
        size: initialSize,
      }
    }
  }

  cellsAvailable(state: BaseState): number {
    return state.cellProps
      .flat()
      .filter((cellProps) => cellProps.usable)
      .length;
  }

  cellsNeeded(): number {
    return this.props.rooms
      .map((room) => room.size)
      .reduce((sum, roomSize) => sum + roomSize);
  }

  // setSize(newSize: number) {
  //   this.setState((state) => {
  //     if (newSize === state.size) {
  //       return state;
  //     }
  //     const cellProps = state.cellProps.map((row) => {
  //       return row.map((_cellProps) => ({ ..._cellProps }));
  //     });
  //     let currentSize = state.size;
  //     while (currentSize < newSize) {
  //       // If the current size is EVEN,
  //       // add a row on the TOP and a column on the RIGHT.
  //       // If the current size is even,
  //       // add a row on the BOTTOM and a column on the LEFT.
  //       if (currentSize % 2 === 0) {
  //         const newRow: CellProps[] = [];
  //         for (let i = 0; i < currentSize; i += 1) {
  //           newRow.push({
  //             coordinates: [],
  //             id: string;
  //             initialUsable?: boolean;
  //             roomName?: string;
  //             setUsable: (usable: boolean) => void;
  //             usable: boolean;
  //             used: boolean;
  //           })
  //         }
  //         cellProps.unshift(newRow);

  //       } else {


  //       }

  //     }

  //     if 


  //     const newState = {
  //       ...state,
  //       size: newSize,
  //     };
  //     return newState
  //   });
  // }

  optimizeBaseLayout(state: BaseState, { iterations }: BaseLayoutOptimizationOptions = { iterations: 10000 }) {
    this._validateRoomSizes(this.props.rooms);
    this._validateRoomUniqueness(this.props.rooms);
    this._validateLinkReciprocity(this.props.rooms);

    let currentCellProps = state.cellProps
    let currentEnergy = this._getEnergy(currentCellProps);
    let globalMinimumMatrixProps = currentCellProps;
    let globalMinimumEnergy = currentEnergy;

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      // Create a near-clone of based on the existing matrix.

      const candidateCellProps = this._cloneBaseLayout(currentCellProps);

      // Swap the room assignments of 2 cells in candidateMatrix (ONLY their roomNames).
      const usableCellProps = candidateCellProps
        .flat()
        .filter((cellProps) => cellProps.usable);

      const cell1Props = usableCellProps[Math.floor(Math.random() * usableCellProps.length)];
      const cellsInOtherRoomsProps = usableCellProps.filter((cellProps) => cellProps.roomName !== cell1Props.roomName);
      const cell2Props = cellsInOtherRoomsProps[Math.floor(Math.random() * cellsInOtherRoomsProps.length)];
      const cell1RoomName = cell1Props.roomName;
      const cell1Used = cell1Props.used;
      const cell2RoomName = cell2Props.roomName;
      const cell2Used = cell2Props.used;

      const [cell1i, cell1j] = cell1Props.coordinates;
      cell1Props.roomName = cell2RoomName;
      cell1Props.used = cell2Used;
      const [cell2i, cell2j] = cell2Props.coordinates;
      cell2Props.roomName = cell1RoomName;
      cell2Props.used = cell1Used;

      const candidateEnergy = this._getEnergy(candidateCellProps);
      const acceptanceProbabilityThreshold = (1 - iteration / iterations);

      if (candidateEnergy < currentEnergy) {
        // console.log(`Energy decreased from (${currentEnergy}) to ${candidateEnergy}.`);
        this._setCellProps(cell1i, cell1j, cell1Props);
        this._setCellProps(cell2i, cell2j, cell2Props);
        currentCellProps = candidateCellProps;
        currentEnergy = candidateEnergy;
      } else if (candidateEnergy > currentEnergy && Math.random() < acceptanceProbabilityThreshold) {
        // console.log(`Energy increased from (${currentEnergy}) to ${candidateEnergy} (probability ${acceptanceProbabilityThreshold}).`);
        this._setCellProps(cell1i, cell1j, cell1Props);
        this._setCellProps(cell2i, cell2j, cell2Props);
        currentCellProps = candidateCellProps;
        currentEnergy = candidateEnergy;
      }
      if (candidateEnergy < globalMinimumEnergy) {
        globalMinimumMatrixProps = candidateCellProps;
        globalMinimumEnergy = candidateEnergy;
      }
    }
    this.setState((state) => ({
      ...state,
      cellProps: globalMinimumMatrixProps,
    }));
    console.log(`Global minimum energy = ${globalMinimumEnergy}.`);
  }

  _assignInitialRooms(cellPropsOriginal: CellProps[][]): CellProps[][] {
    const cellProps = cellPropsOriginal.map((row) => {
      return row.map((cellProps) => ({ ...cellProps }));
    })
    const roomNames = [];
    for (const room of this.props.rooms) {
      for (let i = 0; i < room.size; i += 1) {
        roomNames.push(room.name);
      }
    }
    const usableCellProps = cellProps
      .flat()
      .filter((cellsProps) => cellsProps.usable);
    while (usableCellProps.length > 0) {
      const _cellsProps = usableCellProps
        .splice(Math.floor(Math.random() * usableCellProps.length), 1)
        .pop();
      if (!_cellsProps) {
        throw new Error("Somehow one of the bases's cells was undefined.");
      }
      // Assign the room name. It's actually ok if it's undefined near the end.
      const roomName = roomNames.pop();
      _cellsProps.roomName = roomName;
      _cellsProps.used = !!roomName;
    }
    return cellProps;
  }

  _buildCellProps(size: number): CellProps[][] {
    const cellProps: CellProps[][] = [];
    for (let i = 0; i < size; i += 1) {
      cellProps.push([]);
      for (let j = 0; j < size; j += 1) {
        const key = `${String(i).padStart(4, '0')}${String(j).padStart(4, '0')}`
        cellProps[i].push({
          coordinates: [Number(i), Number(j)],
          id: key,
          initialUsable: false,
          // This gets overwritten in render().
          setUsable: (usable: boolean) => this._setCellProps(i, j, {
            usable,
          }),
          usable: false,
          used: false,
        });
      }
    }
    return cellProps;
  }

  _cloneBaseLayout(originalCellProps: CellProps[][]): CellProps[][] {
    const cloneCellProps: CellProps[][] = originalCellProps.map((row) => {
      return row.map((cellProps) => ({
        ...cellProps,
      }));
    });
    return cloneCellProps;
  }

  _getDistance(cellProps1: CellProps, cellProps2: CellProps): number {
    if (cellProps1.coordinates.length !== cellProps2.coordinates.length) {
      throw new Error(`Cell ${cellProps1.id} has ${cellProps1.coordinates.length} coordinates, but cell ${cellProps2.id} has ${cellProps2.coordinates.length} coordinates.`);
    }
    let distance = 0;
    for (let coord in cellProps1.coordinates) {
      distance += Math.abs(cellProps1.coordinates[coord] - cellProps2.coordinates[coord]);
    }
    return distance;
  }

  _getEnergy(matrix: CellProps[][]): number {
    const cellProps = matrix.flat();
    let intraRoomConnections = 0;
    const intraRoomEnergy = cellProps
      .map((_cellProps) => {
        if (!_cellProps.roomName) {
          return 0;
        }
        const sameRoomCellProps = cellProps.filter((otherCellProps) => {
          return otherCellProps !== _cellProps && otherCellProps.roomName === _cellProps.roomName;
        });
        const energy = sameRoomCellProps
          .map((sameRoomCellProps) => this._getDistance(_cellProps, sameRoomCellProps))
          .map((distance) => Math.pow(distance, 2))
          .reduce((sum, energy) => sum + energy, 0);

        intraRoomConnections += sameRoomCellProps.length;
        return energy;
      })
      .reduce((sum, energy) => sum + energy, 0);

    let interRoomConnections = 0;
    const interRoomEnergy = cellProps
      .map((_cellProps) => {
        if (!_cellProps.roomName) {
          return 0;
        }
        const linkedRoomNames = this.props.rooms
          .filter((room) => room.name === _cellProps.roomName)
          .map((room) => room.links)
          .flat()
          .map((link) => link.name);
        const linkedRoomCellProps = cellProps.filter((otherCellProps) => {
          return linkedRoomNames.includes(otherCellProps.roomName ?? '');
        });
        const energy = linkedRoomCellProps
          .map((_linkedRoomCellProps) => this._getDistance(_cellProps, _linkedRoomCellProps))
          .map((distance) => Math.pow(distance, 2))
          .reduce((sum, energy) => sum + energy, 0);
        interRoomConnections += linkedRoomCellProps.length;
        return energy;
      })
      .reduce((sum, energy) => sum + energy, 0);

    // Give equal weight to the intraRoomEnergy and the interRoomEnergy.
    return intraRoomEnergy / Math.max(1, intraRoomConnections) + interRoomEnergy / Math.max(1, interRoomConnections);
  }

  _setCellProps(i: number, j: number, newCellProps: Partial<CellProps>) {
    this.setState((state) => {
      const newState = {
        ...state,
        cellProps: state.cellProps.map((cellProps, row) => {
          return cellProps.map((cellProps, col) => ({
            ...cellProps,
            ...(
              row === i && col === j
                ? newCellProps
                : {}
            ),
          }));
        })
      };
      localStorage.setItem('baseState', JSON.stringify(newState));
      return newState;
    });
  }

  _validateRoomSizes(rooms: RoomProps[]) {
    for (const room of rooms) {
      if (room.size < 1) {
        throw new Error(`Room with name '${room.name}' has room size '${room.size}', but the minimum room size is 1.`);
      }
    }
  }

  _validateRoomUniqueness(rooms: RoomProps[]) {
    const uniqueRoomNames = new Set();
    for (const room of rooms) {
      if (uniqueRoomNames.has(room.name)) {
        throw new Error(`Multiple rooms have the name '${room.name}'.`);
      }
      uniqueRoomNames.add(room.name);
    }
  }

  _validateLinkReciprocity(rooms: RoomProps[]) {
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

  render() {
    return (
      <div>
        <div className="size-input">
          <p>Size</p>
          <input
            disabled={true}
            // onChange={(event) => {
            //   if (Number(event.target.value) > 0 && Number(event.target.value) < 16) {
            //     this.setSize(Number(event.target.value));
            //   }
            // }}
            type="number"
            value={this.state.size}
          />
        </div>
        <div className="cell-grid" >
          {
            this.state.cellProps.map((row, i) => (
              <div
                className="cell-row"
                key={String(i)}
              >
                {
                  row.map((cellProps, j) => {
                    return (
                      <Cell
                        {...cellProps}
                        setUsable={(usable: boolean) => this._setCellProps(i, j, {
                          usable,
                        })}
                        key={j}
                      />
                    );
                  })
                }
              </div>
            ))
          }
        </div>
        {
          (this.cellsAvailable(this.state) < this.cellsNeeded())
          && (
            <p className="error">
              Cells needed: {this.cellsNeeded()}.
              Cells available: {this.cellsAvailable(this.state)}.
              Please reduce room sizes or enable more cells.
            </p>
          )
        }
        <p>{this.state.isOptimizing}</p>
        <button
          // className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={
            (this.cellsAvailable(this.state) < this.cellsNeeded())
            || this.state.isOptimizing
          }
          onClick={(event) => {
            this.setState({ isOptimizing: true });
            this.optimizeBaseLayout(this.state);
            this.setState({ isOptimizing: false });
          }}
        >
          Optimize
        </button>
      </div >
    );
  }

}
