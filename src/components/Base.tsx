import { ReactElement, useState } from "react";
import './Base.css';

import { Cell, CellProps } from './Cell';
import { RoomProps } from './Room';

export type BaseProps = {
  rooms: RoomProps[];
  intraRoomWeight: number;
  interRoomWeight: number;
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

  const defaultSize = 7;
  const savedSize = getStateFromLocalStorage<number>('size', defaultSize);
  const [size, setSize] = useStateWithLocalStorage('size', savedSize);
  const emptyMatrix: CellProps[][] = new Array(size).fill(undefined).map((_, i) => {
    return new Array(size).fill(undefined).map((_, j) => ({
      coordinates: [i, j],
      setOwnProps: (cellProps) => _withNewCellProps(emptyMatrix, cellProps),
      usable: false,
    }));
  });
  const savedMatrix = reconcile(size, getStateFromLocalStorage<CellProps[][]>('matrix', emptyMatrix),  'reconciling matrix returned from getStateFromLocalStorage');
  const [matrix, setReconciledMatrix] = useStateWithLocalStorage('matrix', savedMatrix);
  const setMatrix = (matrix: CellProps[][]) => {
    const reconciledMatrix = reconcile(size, matrix, 'setting matrix');
    setReconciledMatrix(reconciledMatrix);
  }

  function cellsAvailable(matrix: CellProps[][]): number {
    return matrix
      .flat()
      .filter((cellProps) => cellProps.usable)
      .length;
  }

  function cellsNeeded(): number {
    return props.rooms
      .map((room) => room.size)
      .reduce((sum, roomSize) => sum + roomSize);
  }

  function getStateFromLocalStorage<T>(localStorageKey: string, defaultValue: T): T {
    const valueString = localStorage.getItem(localStorageKey);
    return valueString !== null ? JSON.parse(valueString) : defaultValue;
  }

  function optimizeBaseLayout(originalMatrix: CellProps[][], iterations: number) {
    _validateRoomSizes(props.rooms);
    _validateRoomUniqueness(props.rooms);
    _validateLinkReciprocity(props.rooms);
    let currentMatrix: CellProps[][] = _cloneMatrix(originalMatrix);
    let currentEnergy = _getEnergy(currentMatrix);
    let globalMinimumMatrix = currentMatrix;
    let globalMinimumEnergy = currentEnergy;

    for (let iteration = 0; iteration < iterations; iteration += 1) {

      // Swap the room assignments of 2 cells in candidateMatrix (ONLY their roomNames).
      const candidateMatrix = _cloneMatrix(currentMatrix);
      const usableCellProps = candidateMatrix
        .flat()
        .filter((cellProps) => cellProps.usable);

      const cell1Props = _randomFromArray(usableCellProps);
      if (!cell1Props) {
        throw new Error(`Random selection from array unexpectedly returned undefined. Is the array usableCellProps empty? (length = ${usableCellProps?.length}).`);
      }
      const cellsInOtherRoomsProps = usableCellProps.filter((cellProps) => cellProps.roomName !== cell1Props.roomName);
      const cell2Props = _randomFromArray(cellsInOtherRoomsProps);
      if (!cell2Props) {
        throw new Error(`Random selection from array unexpectedly returned undefined. Is the array cellsInOtherRoomsProps empty? (length = ${cellsInOtherRoomsProps.length}).`);
      }
      const cell1RoomName = cell1Props.roomName;
      const cell2RoomName = cell2Props.roomName;

      const [cell1i, cell1j] = cell1Props.coordinates;
      candidateMatrix[cell1i][cell1j].roomName = cell2RoomName;
      const [cell2i, cell2j] = cell2Props.coordinates;
      candidateMatrix[cell2i][cell2j].roomName = cell1RoomName;

      const candidateEnergy = _getEnergy(candidateMatrix);
      const acceptanceProbabilityThreshold = (1 - iteration / iterations);

      if (
        (candidateEnergy < currentEnergy)
        || (candidateEnergy > currentEnergy && Math.random() < acceptanceProbabilityThreshold)
      ) {
        currentMatrix = candidateMatrix;
        currentEnergy = candidateEnergy;
      }
      if (candidateEnergy < globalMinimumEnergy) {
        globalMinimumMatrix = candidateMatrix;
        globalMinimumEnergy = candidateEnergy;
      }
    }
    console.log(`Global minimum energy = ${globalMinimumEnergy}.`);
    return globalMinimumMatrix
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

  function reconcile(size: number, originalCellProps: CellProps[][], reason: string): CellProps[][] {
    const reconcilers = [
      _reconcileSize,
      _reconcileRooms,
    ];
    let reconciledCellProps = originalCellProps;
    for (const reconciler of reconcilers) {
      reconciledCellProps = reconciler(size, reconciledCellProps);
    }
    return reconciledCellProps;
  }

  function _cloneMatrix(originalMatrix: CellProps[][]): CellProps[][] {
    const clonedMatrix = originalMatrix.map((row) => {
      return row.map((cellProps) => ({
        coordinates: [ ...cellProps.coordinates ],
        roomName: cellProps.roomName,
        setOwnProps: (cellProps: CellProps) => _withNewCellProps(clonedMatrix, cellProps),
        usable: cellProps.usable,
      }));
    });
    return clonedMatrix;
  }

  function _randomFromArray<T>(arr: T[]): T | undefined {
    if (arr.length <= 0) {
      return undefined;
    }
    const choice = arr[Math.floor(Math.random() * arr.length)];
    return choice;
  }

  function _randomFromObject(obj: { [key: string]: number }): string | undefined {
    const arrayofChoices = Object.entries(obj)
      .reduce(
        (arrayofChoices: string[], [choice, count]) => [
          ...arrayofChoices,
          ...new Array(count).fill(choice),
        ],
        []
      );
    const choice = _randomFromArray(arrayofChoices);
    return choice;
  }

  function _reconcileRooms(size: number, originalCellProps: CellProps[][]): CellProps[][] {
    const roomSizesRemaining = props.rooms.reduce(
      (roomSizesRemaining: { [roomName: string]: number }, room) => ({
        ...roomSizesRemaining,
        [room.name]: room.size,
      }),
      {}
    );
    const originalCellPropsClean: CellProps[][] = new Array(size).fill(undefined).map((_, i) => {
      return new Array(size).fill(undefined).map((_, j) => {
        const originalCell = (
          i in originalCellProps
            && Array.isArray(originalCellProps[i])
            && j in originalCellProps[i]
            && typeof originalCellProps[i][j] === 'object'
            ? originalCellProps[i][j]
            : undefined
        );
        const usable = originalCell?.usable ? true : false;
        const roomName =
          !usable
            ? undefined
            : originalCell?.roomName
              && originalCell.roomName in roomSizesRemaining
              && roomSizesRemaining[originalCell.roomName] > 0
              ? originalCell.roomName
              : undefined;
        if (roomName) {
          roomSizesRemaining[roomName] -= 1;
        }
        return {
          coordinates: [Number(i), Number(j)],
          roomName,
          setOwnProps: (cellProps: CellProps) => _withNewCellProps(originalCellPropsClean, cellProps),
          usable,
        };
      });
    });
    const newCellProps: CellProps[][] = new Array(size).fill(undefined).map((_, i) => {
      return new Array(size).fill(undefined).map((_, j) => {
        const originalCell = originalCellPropsClean[i][j];
        const roomName =
          !originalCell.usable
            ? undefined
            : originalCell.roomName
              ? originalCell.roomName
              : _randomFromObject(roomSizesRemaining);
        if (!originalCell.roomName && roomName) {
          roomSizesRemaining[roomName] -= 1;
        }
        return {
          coordinates: [Number(i), Number(j)],
          roomName,
          // This is overwritten in render().
          setOwnProps: (cellProps) => _withNewCellProps(newCellProps, cellProps),
          usable: originalCell.usable || false,
        };
      });
    });
    return newCellProps;
  }

  /**
   * If the current matrix is too SMALL:
   *   If the current size is EVEN,
   *     add a row on the BOTTOM and a column on the LEFT.
   *   If the current size is ODD,
   *     add a row on the TOP and a column on the RIGHT.
   * If the current matrix is too BIG:
   *   If the current size is EVEN,
   *     remove a row from the TOP and a column from the RIGHT.
   *   If the current size is ODD,
   *     remove a row from the BOTTOM and a column from the LEFT.
   */
  function _reconcileSize(size: number, originalMatrix: CellProps[][]): CellProps[][] {
    const newMatrix = _cloneMatrix(originalMatrix);

    for (let i = 0; i < size; i += 1) {

      if (newMatrix.length < size) {
        if (newMatrix.length % 2 === 0) {
          // Add a row to the bottom.
          newMatrix.push([]);
        } else {
          // Add a row to the top.
          newMatrix.unshift([]);
        }
      }
      if (newMatrix.length > size) {
        if (newMatrix.length % 2 === 0) {
          // Remove a row from the top.
          newMatrix.shift();
        } else {
          // Remove a row from the bottom.
          newMatrix.pop();
        }
      }

      for (let j = 0; j < size; j += 1) {

        if (newMatrix[i].length < size) {
          if (newMatrix[i].length % 2 === 0) {
            // Add a column on the left.
            newMatrix[i].unshift({
              coordinates: [i, j],
              setOwnProps: (cellProps) => _withNewCellProps(newMatrix, cellProps),
              usable: false,
            });
          } else {
            // Add a column on the right.
            newMatrix[i].push({
              coordinates: [i, j],
              setOwnProps: (cellProps) => _withNewCellProps(newMatrix, cellProps),
              usable: false,
            });
          }
        }
        if (newMatrix[i].length > size) {
          if (newMatrix[i].length % 2 === 0) {
            // Remove a column from the right.
            newMatrix[i].pop();
          } else {
            // Remove a column from the left.
            newMatrix[i].shift();
          }
        }

        newMatrix[i][j] = {
          coordinates: [i, j],
          roomName: newMatrix[i][j].roomName,
          setOwnProps: (cellProps) => _withNewCellProps(newMatrix, cellProps),
          usable: newMatrix[i][j].usable,
        };

      }
    }
    return newMatrix;
  }

  function _getDistance(cellProps1: CellProps, cellProps2: CellProps): number {
    if (cellProps1.coordinates.length !== cellProps2.coordinates.length) {
      throw new Error(`Cell with coordinates ${cellProps1.coordinates} has ${cellProps1.coordinates.length} coordinates, but cell with coordinates ${cellProps1.coordinates} has ${cellProps2.coordinates.length} coordinates.`);
    }
    let distance = 0;
    for (let coord in cellProps1.coordinates) {
      distance += Math.abs(cellProps1.coordinates[coord] - cellProps2.coordinates[coord]);
    }
    return distance;
  }

  function _getEnergy(matrix: CellProps[][]): number {
    const cellProps = matrix.flat();
    const energy = cellProps
      .map((_cellProps) => {
        if (!_cellProps.roomName) {
          return 0;
        }
        const room = props.rooms.find((room) => room.name === _cellProps.roomName);
        if (!room) {
          throw new Error(`Somehow a cell has room name ${_cellProps.roomName}, but there is no such room.`);
        }
        const sameRoomCells = cellProps.filter((otherCellProps) => {
          return otherCellProps !== _cellProps
            && otherCellProps.roomName === _cellProps.roomName;
        });
        const linkedRoomNames = room.links.map((link) => link.name);
        const linkedRoomCells = cellProps.filter((otherCellProps) => {
          return otherCellProps.roomName && linkedRoomNames.includes(otherCellProps.roomName);
        });

        const [
          intraRoomEnergy,
          interRoomEnergy,
        ] = [
          sameRoomCells,
          linkedRoomCells,
        ]
          .map((otherCells) => otherCells
            .map((otherCell) => _getDistance(_cellProps, otherCell))
            .map((distance) => Math.pow(distance, 2))
            .reduce((sum, energy) => sum + energy, 0)
          );
        const energy =
          Math.pow(intraRoomEnergy, props.intraRoomWeight)
          + Math.pow(interRoomEnergy, props.interRoomWeight);
        return energy;
      })
      .reduce((sum, energy) => sum + energy, 0);
    return energy;
  }

  function _withNewCellProps(originalMatrix: CellProps[][], newCellProps: CellProps) {
    const [i, j] = newCellProps.coordinates;
    const newMatrix = originalMatrix.map((row, rowNum) => {
      return row.map((cellProps, colNum) => ({
        ...cellProps,
        ...(
          rowNum === i && colNum === j
            ? newCellProps
            : {}
        ),
      }));
    });
    return newMatrix;
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
          disabled={isOptimizing}
          max={16}
          min={1}
          onChange={(event) => {
            if (Number(event.target.value) > 0 && Number(event.target.value) < 16) {
              setSize(Number(event.target.value));
            }
          }}
          type="number"
          value={size}
        />
      </div>
      <div className="cell-grid" >
        {
          matrix.map((row, i) => (
            <div
              className="cell-row"
              key={String(i)}
            >
              {
                row.map((cellProps, j) => {
                  return (
                    <Cell
                      {...cellProps}
                      setOwnProps={(cellProps) => {
                        const newMatrix = _withNewCellProps(matrix, cellProps);
                        setMatrix(newMatrix);
                      }}
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
        (cellsAvailable(matrix) < cellsNeeded())
        && (
          <p className="error">
            Cells needed: {cellsNeeded()}.
            Cells available: {cellsAvailable(matrix)}.
            Please reduce room sizes or enable more cells.
          </p>
        )
      }
      <p>{isOptimizing}</p>
      <button
        // className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        disabled={
          (cellsAvailable(matrix) < cellsNeeded())
          || isOptimizing
        }
        onClick={(event) => {
          setIsOptimizing(true);
          try {
            const newMatrix = optimizeBaseLayout(matrix, props.iterations);
            setMatrix(newMatrix);
          } catch (err) {
            console.error(err);
          }
          setIsOptimizing(false);
        }}
      >
        Optimize
      </button>
    </div >
  );

}
