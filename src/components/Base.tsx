import { ReactElement, useState } from "react";
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

export function Base(props: BaseProps): ReactElement {

  const [isOptimizing, setIsOptimizing] = useState(false);

  const savedSize = getStateFromLocalStorage<number>('size');
  const [size, setSize] = useStateWithLocalStorage('size', savedSize ?? 7);
  const savedCellProps = getStateFromLocalStorage<CellProps[][]>('cellProps');
  const [cellProps, setCellProps] = useStateWithLocalStorage('cellProps', reconcile(size, savedCellProps));

  function cellsAvailable(cellProps: CellProps[][]): number {
    return cellProps
      .flat()
      .filter((cellProps) => cellProps.usable)
      .length;
  }

  function cellsNeeded(): number {
    return props.rooms
      .map((room) => room.size)
      .reduce((sum, roomSize) => sum + roomSize);
  }

  // setSize(newSize: number) {
  //   setState((state) => {
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

  function getStateFromLocalStorage<T>(localStorageKey: string): T {
    const valueString = localStorage.getItem(localStorageKey);
    return valueString !== null ? JSON.parse(valueString) : undefined;
  }

  function optimizeBaseLayout(cellProps: CellProps[][], { iterations }: BaseLayoutOptimizationOptions = { iterations: 10000 }) {
    _validateRoomSizes(props.rooms);
    _validateRoomUniqueness(props.rooms);
    _validateLinkReciprocity(props.rooms);
    let currentCellProps = cellProps;
    let currentEnergy = _getEnergy(currentCellProps);
    let globalMinimumMatrixProps = currentCellProps;
    let globalMinimumEnergy = currentEnergy;

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      // Create a near-clone of based on the existing matrix.

      const candidateCellProps = _cloneBaseLayout(currentCellProps);

      // Swap the room assignments of 2 cells in candidateMatrix (ONLY their roomNames).
      const usableCellProps = candidateCellProps
        .flat()
        .filter((cellProps) => cellProps.usable);

      const cell1Props = usableCellProps[Math.floor(Math.random() * usableCellProps.length)];
      const cellsInOtherRoomsProps = usableCellProps.filter((cellProps) => cellProps.roomName !== cell1Props.roomName);
      const cell2Props = cellsInOtherRoomsProps[Math.floor(Math.random() * cellsInOtherRoomsProps.length)];
      const cell1RoomName = cell1Props.roomName;
      const cell2RoomName = cell2Props.roomName;

      const [cell1i, cell1j] = cell1Props.coordinates;
      cell1Props.roomName = cell2RoomName;
      const [cell2i, cell2j] = cell2Props.coordinates;
      cell2Props.roomName = cell1RoomName;

      const candidateEnergy = _getEnergy(candidateCellProps);
      const acceptanceProbabilityThreshold = (1 - iteration / iterations);

      if (candidateEnergy < currentEnergy) {
        // console.log(`Energy decreased from (${currentEnergy}) to ${candidateEnergy}.`);
        _setOneCellProps(cell1i, cell1j, cell1Props);
        _setOneCellProps(cell2i, cell2j, cell2Props);
        currentCellProps = candidateCellProps;
        currentEnergy = candidateEnergy;
      } else if (candidateEnergy > currentEnergy && Math.random() < acceptanceProbabilityThreshold) {
        // console.log(`Energy increased from (${currentEnergy}) to ${candidateEnergy} (probability ${acceptanceProbabilityThreshold}).`);
        _setOneCellProps(cell1i, cell1j, cell1Props);
        _setOneCellProps(cell2i, cell2j, cell2Props);
        currentCellProps = candidateCellProps;
        currentEnergy = candidateEnergy;
      }
      if (candidateEnergy < globalMinimumEnergy) {
        globalMinimumMatrixProps = candidateCellProps;
        globalMinimumEnergy = candidateEnergy;
      }
    }
    setCellProps(globalMinimumMatrixProps);
    console.log(`Global minimum energy = ${globalMinimumEnergy}.`);
  }

  function useStateWithLocalStorage<T>(localStorageKey: string, value: T): [T, React.Dispatch<T>] {
    localStorage.setItem(localStorageKey, JSON.stringify(value));
    const [val, setVal] = useState(value);
    return [
      val,
      (newValue) => {
        localStorage.setItem(localStorageKey, JSON.stringify(newValue));
        return setVal(newValue);
      },
    ];
  }

  function reconcile(size: number, originalCellProps: CellProps[][]): CellProps[][] {
    return _reconcileRooms(size, originalCellProps);
  }

  function _reconcileRooms(size: number, originalCellProps: CellProps[][]): CellProps[][] {

    const newCellProps: CellProps[][] = [];
    for (let i = 0; i < size; i += 1) {
      newCellProps.push([]);
      for (let j = 0; j < size; j += 1) {
        let savedRoomName = undefined;
        let savedRoomUsability = false;
        if (i in originalCellProps && j in originalCellProps[i]) {
          savedRoomName = originalCellProps[i][j].roomName;
          savedRoomUsability = originalCellProps[i][j].usable;
        }
        newCellProps[i].push({
          coordinates: [Number(i), Number(j)],
          id: String(crypto.getRandomValues(new Uint8Array(8))),
          ...(savedRoomName && { roomName: savedRoomName }),
          // This is overwritten in render().
          setOwnProps: (cellProps) => { },
          usable: savedRoomUsability ? true : false,
        });
      }
    }

    const roomNames = props.rooms.map((room) => room.name);

    // Reconcile room names.
    // Clear room names if the rooms are overassigned.
    const roomCellCountsRemaining = props.rooms.reduce(
      (roomCellCounts: { [roomName: string]: number }, room) => ({
        ...roomCellCounts,
        [room.name]: room.size,
      }),
      {}
    );
    for (const row of newCellProps) {
      for (const _newCellProps of row) {
        if (!_newCellProps.roomName) {
          continue;
        }
        if (!roomNames.includes(_newCellProps.roomName)) {
          delete _newCellProps.roomName;
          continue;
        }
        const room = props.rooms.find((room) => room.name === _newCellProps.roomName);
        if (!room) {
          throw new Error(`Somehow room name ${_newCellProps.roomName} was not found in the rooms configuration, even though its presence was just verified.`);
        }
        if (roomCellCountsRemaining[_newCellProps.roomName] > 0) {
          roomCellCountsRemaining[_newCellProps.roomName] -= 1;
        } else {
          delete _newCellProps.roomName;
        }
      }
    }

    // Reconcile room names.
    // Assign remaining room names.
    const remainingUsableCellPropsIndexes = [];
    for (let i = 0; i < newCellProps.length; i += 1) {
      for (let j = 0; j < newCellProps[i].length; j += 1) {
        if (newCellProps[i][j].usable && !newCellProps[i][j].roomName) {
          remainingUsableCellPropsIndexes.push([i, j]);
        }
      }
    }
    const roomCellNamesRemaining = Object.entries(roomCellCountsRemaining).reduce(
      (roomCellNamesRemaining: string[], [roomName, count]) => {
        for (let i = 0; i < count; i += 1) {
          roomCellNamesRemaining.push(roomName);
        }
        return roomCellNamesRemaining;
      },
      []
    );
    while (remainingUsableCellPropsIndexes.length > 0) {
      const _cellPropsIndexes = remainingUsableCellPropsIndexes
        .splice(Math.floor(Math.random() * remainingUsableCellPropsIndexes.length), 1)
        .pop();
      if (!_cellPropsIndexes) {
        throw new Error("Somehow one of the bases's cells was undefined.");
      }
      const [i, j] = _cellPropsIndexes;
      // Assign the room name. It's actually ok if it's undefined near the end.
      const roomName = roomCellNamesRemaining.pop();
      newCellProps[i][j].roomName = roomName;
    }
    return newCellProps;
  }

  function _cloneBaseLayout(originalCellProps: CellProps[][]): CellProps[][] {
    const cloneCellProps: CellProps[][] = originalCellProps.map((row) => {
      return row.map((cellProps) => ({
        ...cellProps,
      }));
    });
    return cloneCellProps;
  }

  function _getDistance(cellProps1: CellProps, cellProps2: CellProps): number {
    if (cellProps1.coordinates.length !== cellProps2.coordinates.length) {
      throw new Error(`Cell ${cellProps1.id} has ${cellProps1.coordinates.length} coordinates, but cell ${cellProps2.id} has ${cellProps2.coordinates.length} coordinates.`);
    }
    let distance = 0;
    for (let coord in cellProps1.coordinates) {
      distance += Math.abs(cellProps1.coordinates[coord] - cellProps2.coordinates[coord]);
    }
    return distance;
  }

  function _getEnergy(matrix: CellProps[][]): number {
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
          .map((sameRoomCellProps) => _getDistance(_cellProps, sameRoomCellProps))
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
        const linkedRoomNames = props.rooms
          .filter((room) => room.name === _cellProps.roomName)
          .map((room) => room.links)
          .flat()
          .map((link) => link.name);
        const linkedRoomCellProps = cellProps.filter((otherCellProps) => {
          return linkedRoomNames.includes(otherCellProps.roomName ?? '');
        });
        const energy = linkedRoomCellProps
          .map((_linkedRoomCellProps) => _getDistance(_cellProps, _linkedRoomCellProps))
          .map((distance) => Math.pow(distance, 2))
          .reduce((sum, energy) => sum + energy, 0);
        interRoomConnections += linkedRoomCellProps.length;
        return energy;
      })
      .reduce((sum, energy) => sum + energy, 0);

    // Give equal weight to the intraRoomEnergy and the interRoomEnergy.
    return intraRoomEnergy / Math.max(1, intraRoomConnections) + interRoomEnergy / Math.max(1, interRoomConnections);
  }

  function _setOneCellProps(i: number, j: number, changedCellProps: CellProps) {
    const newCellProps = cellProps.map((row, rowNum) => {
      return row.map((_cellProps, colNum) => ({
        ..._cellProps,
        ...(
          rowNum === i && colNum === j
            ? changedCellProps
            : {}
        ),
      }));
    });
    const reconciledCellProps = reconcile(size, newCellProps);
    setCellProps(reconciledCellProps);
  }

  function _validateRoomSizes(rooms: RoomProps[]) {
    for (const room of rooms) {
      if (room.size < 1) {
        throw new Error(`Room with name '${room.name}' has room size '${room.size}', but the minimum room size is 1.`);
      }
    }
  }

  function _validateRoomUniqueness(rooms: RoomProps[]) {
    const uniqueRoomNames = new Set();
    for (const room of rooms) {
      if (uniqueRoomNames.has(room.name)) {
        throw new Error(`Multiple rooms have the name '${room.name}'.`);
      }
      uniqueRoomNames.add(room.name);
    }
  }

  function _validateLinkReciprocity(rooms: RoomProps[]) {
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

  return (
    <div>
      <div className="size-input">
        <p>Size</p>
        <input
          disabled={true}
          // onChange={(event) => {
          //   if (Number(event.target.value) > 0 && Number(event.target.value) < 16) {
          //     setSize(Number(event.target.value));
          //   }
          // }}
          type="number"
          value={size}
        />
      </div>
      <div className="cell-grid" >
        {
          cellProps.map((row, i) => (
            <div
              className="cell-row"
              key={String(i)}
            >
              {
                row.map((cellProps, j) => {
                  return (
                    <Cell
                      {...cellProps}
                      setOwnProps={(cellProps) => _setOneCellProps(i, j, cellProps)}
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
        (cellsAvailable(cellProps) < cellsNeeded())
        && (
          <p className="error">
            Cells needed: {cellsNeeded()}.
            Cells available: {cellsAvailable(cellProps)}.
            Please reduce room sizes or enable more cells.
          </p>
        )
      }
      <p>{isOptimizing}</p>
      <button
        // className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        disabled={
          (cellsAvailable(cellProps) < cellsNeeded())
          || isOptimizing
        }
        onClick={(event) => {
          setIsOptimizing(true);
          optimizeBaseLayout(cellProps);
          setIsOptimizing(false);
        }}
      >
        Optimize
      </button>
    </div >
  );

}
