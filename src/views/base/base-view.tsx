import { ReactElement, useState } from "react";

import {
  CellView,
} from '../cell';
import {
  Cell
} from '../../models/cell';
import { RoomViewProps } from '../room';

export type BaseViewProps = {
  centerOfMassWeight: number;
  intraRoomWeight: number;
  interRoomWeight: number;
  iterations: number;
}

export type BaseViewState = {
  rooms: RoomViewProps[];
}

export class NotEnoughSpaceError extends Error {
  constructor(cellsAvailable: number, cellsNeeded: number) {
    const message = `${cellsAvailable} cell(s) are available, but ${cellsNeeded} cell(s) are needed.`;
    super(message);
  }
}

export function BaseView(props: BaseViewProps): ReactElement {

  const defaultRooms: RoomViewProps[] = [
    {
      color: "#ff7373",
      id: _createId(),
      links: [
        {
          name: 'storage',
        },
      ],
      name: "kitchen",
      size: 1
    },
    {
      color: "#fc8332",
      id: _createId(),
      links: [
        {
          name: 'kitchen',
        },
      ],
      name: "storage",
      size: 1
    },
    {
      color: "#048a49",
      id: _createId(),
      links: [],
      name: "bedroom 1",
      size: 1
    },
  ];

  const savedRooms = getStateFromLocalStorage<RoomViewProps[]>('rooms', defaultRooms);
  const reconciledSavedRooms = _reconcileRoomLinks(savedRooms);
  const [rooms, setRoomsBeforeReconcilingMatrix] = useStateWithLocalStorage('rooms', reconciledSavedRooms);
  const roomLookup: { [roomId: string]: RoomViewProps } = rooms.reduce((roomLookup, room) => ({
    ...roomLookup,
    [room.id]: room,
  }), {})

  const setRooms = (rooms: RoomViewProps[]) => {
    // TODO somehow refactor this so that there is no state overlap between the rooms and the matrix.
    setRoomsBeforeReconcilingMatrix(rooms);
    const reconciledMatrix = reconcile(size, matrix, rooms, 'after updating rooms');
    setReconciledMatrix(reconciledMatrix);
  };

  const [isOptimizing, setIsOptimizing] = useState(false);

  const defaultSize = 7;

  const emptyMatrix: Cell[][] = new Array(defaultSize).fill(undefined).map((_, i) => {
    return new Array(defaultSize).fill(undefined).map((_, j) => ({
      coordinates: [i, j],
      usable: false,
    }));
  });

  const savedMatrix = getStateFromLocalStorage<Cell[][]>('matrix', emptyMatrix);
  const reconciledSavedMatrix = reconcile(savedMatrix.length, savedMatrix, rooms, 'reconciling matrix returned from getStateFromLocalStorage');

  const [matrix, setReconciledMatrix] = useStateWithLocalStorage('matrix', reconciledSavedMatrix);
  const size = reconciledSavedMatrix.length;
  const setSize = (size: number) => {
    const reconciledMatrix = reconcile(size, matrix, rooms, 'setting size');
    setReconciledMatrix(reconciledMatrix);
  };
  const setMatrix = (matrix: Cell[][]) => {
    const reconciledMatrix = reconcile(size, matrix, rooms, 'setting matrix');
    setReconciledMatrix(reconciledMatrix);
  };

  function cellsAvailable(matrix: Cell[][]): number {
    return matrix
      .flat()
      .filter((cell) => cell.usable)
      .length;
  }

  function cellsNeeded(): number {
    return rooms
      .map((room) => room.size)
      .reduce((sum, roomSize) => sum + roomSize, 0);
  }


  function getStateFromLocalStorage<T>(localStorageKey: string, defaultValue: T): T {
    const valueString = localStorage.getItem(localStorageKey);
    return valueString !== null ? JSON.parse(valueString) : defaultValue;
  }

  function optimizeBaseLayout(originalMatrix: Cell[][]) {
    _validateRoomSizes(rooms);
    _validateLinkReciprocity(rooms);

    let currentMatrix: Cell[][] = _cloneMatrix(originalMatrix);
    let currentEnergy = _getEnergy(currentMatrix);
    let globalMinimumMatrix = currentMatrix;
    let globalMinimumEnergy = currentEnergy;

    for (let iteration = 0; iteration < props.iterations; iteration += 1) {

      // Swap the room assignments of 2 cells in candidateMatrix (ONLY their roomIds).
      const candidateMatrix = _cloneMatrix(currentMatrix);
      const usableCells = candidateMatrix
        .flat()
        .filter((cell) => cell.usable);

      const cell1 = _randomFromArray(usableCells);
      if (!cell1) {
        throw new Error(`Random selection from array unexpectedly returned undefined. Is the array usableCells empty? (length = ${usableCells?.length}).`);
      }
      const cellsInOtherRooms = usableCells
        .filter((cell) => cell.roomId !== cell1.roomId);

      // If cell1 belongs to a room of size 1 with no links (such as a bedroom),
      // then don't bother trying to swap it with another such room,
      // Because the energy will be the same, and it will waste an iteration.
      const cell1Room = cell1.roomId ? roomLookup[cell1.roomId] : undefined;
      const swappableCells =
        (cell1Room && cell1Room.size <= 1 && cell1Room.links.length <= 0)
          ? cellsInOtherRooms.filter((cell) => {
            const cell2Room = cell.roomId ? roomLookup[cell.roomId] : undefined;
            const isUselessSwap = cell2Room && cell2Room.size <= 1 && cell2Room.links.length <= 0;
            return !isUselessSwap;
          })
          : cellsInOtherRooms;

      const cell2 = _randomFromArray(swappableCells);
      if (!cell2) {
        throw new Error(`Random selection from array unexpectedly returned undefined. Is the array cellsInOtherRooms empty? (length = ${cellsInOtherRooms.length}).`);
      }
      const cell1RoomId = cell1.roomId;
      const cell2RoomId = cell2.roomId;

      const [cell1i, cell1j] = cell1.coordinates;
      candidateMatrix[cell1i][cell1j].roomId = cell2RoomId;
      const [cell2i, cell2j] = cell2.coordinates;
      candidateMatrix[cell2i][cell2j].roomId = cell1RoomId;

      const candidateEnergy = _getEnergy(candidateMatrix);

      // Linear
      // const energyIncreaseAcceptanceProbability = (props.iterations - iteration) / props.iterations;
      // Quadratic
      const energyIncreaseFractionAllowed = 1 + Math.pow(props.iterations - iteration, 2) / Math.pow(props.iterations, 2);

      const energyIncreaseFraction = candidateEnergy / globalMinimumEnergy;

      if (energyIncreaseFraction < energyIncreaseFractionAllowed) {
        currentMatrix = candidateMatrix;
        currentEnergy = candidateEnergy;
        // console.log(`currentEnergy changed to ${currentEnergy}`);
      }
      if (candidateEnergy < globalMinimumEnergy) {
        globalMinimumMatrix = candidateMatrix;
        globalMinimumEnergy = candidateEnergy;
        console.log(`New global minimum discovered (${Math.floor(globalMinimumEnergy)}) at iteration ${iteration} of ${props.iterations} (${Math.floor(iteration / props.iterations * 100)}%)!`);
      }
    }
    console.log('Done.');
    return globalMinimumMatrix;
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

  function reconcile(newSize: number, newMatrix: Cell[][], newRooms: RoomViewProps[], reason: string): Cell[][] {
    const reconcilers = [
      _reconcileSize,
      _reconcileRooms,
    ];
    let reconciledMatrix = _cloneMatrix(newMatrix);
    for (const reconciler of reconcilers) {
      reconciledMatrix = reconciler(newSize, reconciledMatrix, newRooms);
    }
    return reconciledMatrix;
  }

  function _cloneMatrix(originalMatrix: Cell[][]): Cell[][] {
    const clonedMatrix = originalMatrix.map((row) => {
      return row.map((cell) => new Cell({
        coordinates: [...cell.coordinates],
        roomId: cell.roomId,
        usable: cell.usable,
      }));
    });
    return clonedMatrix;
  }

  function _createId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((idPart) => _padWithZeros(idPart, Uint8Array.length))
      .join('');
  }

  function _padWithZeros(value: number | string, finalLength: number): string {
    let valueString = String(value);
    while (valueString.length < finalLength) {
      valueString = `0${valueString}`;
    }
    return valueString;
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

  function _reconcileRoomLinks(rooms: RoomViewProps[]): RoomViewProps[] {
    return rooms.map((room) => ({
      ...room,
      links: [
        ...room.links.filter((link) => {
          const otherRoom = rooms.find((otherRoom) => otherRoom.name === link.name);
          return otherRoom?.links
            .map((otherRoomLink) => otherRoomLink.name)
            .includes(room.name);
        }),
      ],
    }));
  }

  function _reconcileRooms(newSize: number, newMatrixOriginal: Cell[][], newRooms: RoomViewProps[]): Cell[][] {
    const roomSizesRemaining: { [roomId: string]: number } = newRooms.reduce(
      (roomSizesRemaining, room) => ({
        ...roomSizesRemaining,
        [room.id]: room.size,
      }),
      {}
    );
    const originalCellsClean: Cell[][] = new Array(newSize).fill(undefined).map((_, i) => {
      return new Array(newSize).fill(undefined).map((_, j) => {
        const originalCell = (
          i in newMatrixOriginal
            && Array.isArray(newMatrixOriginal[i])
            && j in newMatrixOriginal[i]
            && typeof newMatrixOriginal[i][j] === 'object'
            ? newMatrixOriginal[i][j]
            : undefined
        );
        const usable = originalCell?.usable ? true : false;
        const roomId =
          !usable
            ? undefined
            : originalCell?.roomId
              && originalCell.roomId in roomSizesRemaining
              && roomSizesRemaining[originalCell.roomId] > 0
              ? originalCell.roomId
              : undefined;
        if (roomId) {
          roomSizesRemaining[roomId] -= 1;
        }
        return {
          coordinates: [Number(i), Number(j)],
          roomId,
          usable,
        };
      });
    });
    const newMatrix: Cell[][] = new Array(newSize).fill(undefined).map((_, i) => {
      return new Array(newSize).fill(undefined).map((_, j) => {
        const originalCell = originalCellsClean[i][j];
        const roomId =
          !originalCell.usable
            ? undefined
            : originalCell.roomId
              ? originalCell.roomId
              : _randomFromObject(roomSizesRemaining);
        if (!originalCell.roomId && roomId) {
          roomSizesRemaining[roomId] -= 1;
        }
        return {
          coordinates: [Number(i), Number(j)],
          roomId,
          usable: originalCell.usable || false,
        };
      });
    });
    return newMatrix;
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
  function _reconcileSize(newSize: number, newMatrixOriginal: Cell[][], _: RoomViewProps[]): Cell[][] {
    const newMatrix = _cloneMatrix(newMatrixOriginal);

    for (let i = 0; i < newSize; i += 1) {

      if (newMatrix.length < newSize) {
        if (newMatrix.length % 2 === 0) {
          // Add a row to the bottom.
          newMatrix.push([]);
        } else {
          // Add a row to the top.
          newMatrix.unshift([]);
        }
      }
      if (newMatrix.length > newSize) {
        if (newMatrix.length % 2 === 0) {
          // Remove a row from the top.
          newMatrix.shift();
        } else {
          // Remove a row from the bottom.
          newMatrix.pop();
        }
      }

      for (let j = 0; j < newSize; j += 1) {

        if (newMatrix[i].length < newSize) {
          if (newMatrix[i].length % 2 === 0) {
            // Add a column on the left.
            newMatrix[i].unshift(new Cell({
              coordinates: [i, j],
              usable: false,
            }));
          } else {
            // Add a column on the right.
            newMatrix[i].push(new Cell({
              coordinates: [i, j],
              usable: false,
            }));
          }
        }
        if (newMatrix[i].length > newSize) {
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
          roomId: newMatrix[i][j].roomId,
          usable: newMatrix[i][j].usable,
        };

      }
    }
    return newMatrix;
  }

  function _getDistance(cell1: Cell, cell2: Cell): number {
    if (cell1.coordinates.length !== cell2.coordinates.length) {
      throw new Error(`Cell with coordinates ${cell1.coordinates} has ${cell1.coordinates.length} coordinates, but cell with coordinates ${cell1.coordinates} has ${cell2.coordinates.length} coordinates.`);
    }
    let quadraticSum = 0;
    for (let c = 0; c < cell1.coordinates.length; c += 1) {
      quadraticSum += Math.pow(cell1.coordinates[c] - cell2.coordinates[c], 2);
    }
    const distance = Math.pow(quadraticSum, 0.5);
    return distance;
  }

  function _getEnergy(matrix: Cell[][]): number {
    const cells = matrix.flat();

    const cellEnergyStats = cells
      .filter((cell) => cell.usable)
      .map((cell) => {
        if (!cell.roomId) {
          return {
            centerOfMassStats: {
              count: 0,
              energy: 0,
            },
            intraRoomStats: {
              count: 0,
              energy: 0,
            },
            interRoomStats: {
              count: 0,
              energy: 0,
            },
          };
        }
        const room = cell.roomId ? roomLookup[cell.roomId] : undefined;
        if (!room) {
          throw new Error(`Somehow a cell has room name ${cell.roomId}, but there is no such room.`);
        }

        const allOtherCells = cells.filter((otherCell) => otherCell !== cell);

        const sameRoomCells = cells.filter((otherCell) => {
          return otherCell !== cell && otherCell.roomId === cell.roomId;
        });

        const linkedRoomNames = room.links.map((link) => link.name);
        const linkedRoomCells = cells
          .filter((otherCell) => {
            const linkedRoomIds = linkedRoomNames.map((linkedRoomName) => {
              const linkedRoom = rooms.find((room) => room.name === linkedRoomName);
              if (!linkedRoom) {
                throw new Error(`There is a link to a room with name ${linkedRoomName}, but there is no such room.`);
              }
              return linkedRoom.id;
            });
            return otherCell.roomId && linkedRoomIds.includes(otherCell.roomId);
          });

        const [
          centerOfMassStats,
          intraRoomStats,
          interRoomStats,
        ] = [
          allOtherCells,
          sameRoomCells,
          linkedRoomCells,
        ]
          .map((cellGroup) => cellGroup
            .map((otherCell) => _getDistance(cell, otherCell))
            .map((distance) => Math.pow(distance, 2))
            .reduce(
              ({ count, energy }, e) => ({
                count: count + 1,
                energy: energy + e,
              }),
              {
                count: 0,
                energy: 0,
              }
            )
          );
        return {
          centerOfMassStats,
          intraRoomStats,
          interRoomStats,
        };
      });

    const matrixEnergyStats = cellEnergyStats.reduce((matrixEnergyStats, _cellEnergyStats) => ({
      centerOfMassStats: {
        count: matrixEnergyStats.centerOfMassStats.count + _cellEnergyStats.centerOfMassStats.count,
        energy: matrixEnergyStats.centerOfMassStats.energy + _cellEnergyStats.centerOfMassStats.energy,
      },
      intraRoomStats: {
        count: matrixEnergyStats.intraRoomStats.count + _cellEnergyStats.intraRoomStats.count,
        energy: matrixEnergyStats.intraRoomStats.energy + _cellEnergyStats.intraRoomStats.energy,
      },
      interRoomStats: {
        count: matrixEnergyStats.interRoomStats.count + _cellEnergyStats.interRoomStats.count,
        energy: matrixEnergyStats.interRoomStats.energy + _cellEnergyStats.interRoomStats.energy,
      },
    }),
      {
        centerOfMassStats: {
          count: 0,
          energy: 0,
        },
        intraRoomStats: {
          count: 0,
          energy: 0,
        },
        interRoomStats: {
          count: 0,
          energy: 0,
        },
      }
    );
    const { centerOfMassStats, intraRoomStats, interRoomStats } = matrixEnergyStats;
    const energy =
      (centerOfMassStats.count === 0 ? 0 : Math.pow(centerOfMassStats.energy / centerOfMassStats.count, props.centerOfMassWeight))
      + (intraRoomStats.count === 0 ? 0 : Math.pow(intraRoomStats.energy / intraRoomStats.count, props.intraRoomWeight))
      + (interRoomStats.count === 0 ? 0 : Math.pow(interRoomStats.energy / interRoomStats.count, props.interRoomWeight));
    return energy;
  }

  function _randomColor(): string {
    const colorsHex = Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map((color) => {
        const hex = Number(color).toString(16);
        const paddedHex = _padWithZeros(hex, 2);
        return paddedHex;
      });
    return `#${colorsHex.join('')}`;
  }

  function _roundToSignificantDigits(value: number, significantDigits: number): number {
    const orderOfMagnitude = Math.ceil(Math.log10(value));
    const roundedEnergy = Math.round(value * Math.pow(10, significantDigits - orderOfMagnitude)) / Math.pow(10, significantDigits - orderOfMagnitude);
    return roundedEnergy;
  }

  function _withUpdatedCell(originalMatrix: Cell[][], updatedCell: Cell) {
    const [i, j] = updatedCell.coordinates;
    const newMatrix = originalMatrix.map((row, rowNum) => {
      return row.map((cell, colNum) => ({
        ...cell,
        ...(
          rowNum === i && colNum === j
            ? updatedCell
            : {}
        ),
      }));
    });
    return newMatrix;
  }

  function _validateRoomSizes(rooms: RoomViewProps[]) {
    for (const room of rooms) {
      if (room.size < 1) {
        throw new Error(`Room with name '${room.name}' has room size '${room.size}', but the minimum room size is 1.`);
      }
    }
  }

  function _roomNameIsUnique(roomName: string): boolean {
    const existingRoomNames = new Set(rooms.map((room) => room.name));
    return !existingRoomNames.has(roomName);
  }

  function _validateLinkReciprocity(rooms: RoomViewProps[]) {
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
      <div className="cell-grid">
        <h2>Base</h2>
        {
          matrix.map((row, i) => (
            <div
              className="cell-row"
              key={String(i)}
            >
              {
                row.map((cell, j) => {
                  const room = cell.roomId ? roomLookup[cell.roomId] : undefined;
                  const roomName = room?.name;
                  const color = room?.color;
                  return (
                    <CellView
                      color={color}
                      coordinates={cell.coordinates}
                      key={j}
                      roomName={roomName}
                      updateSelf={(cell: Cell) => {
                        const newMatrix = _withUpdatedCell(matrix, cell);
                        setMatrix(newMatrix);
                      }}
                      usable={cell.usable}
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
        onClick={(_) => {
          setIsOptimizing(true);
          try {
            const newMatrix = optimizeBaseLayout(matrix);
            setMatrix(newMatrix);
          } catch (err) {
            console.error(err);
          }
          setIsOptimizing(false);
        }}
      >
        Optimize
      </button>
      {
        isOptimizing && <div className="spinner"></div>
      }
      <p>Current energy: {_roundToSignificantDigits(_getEnergy(matrix), 4).toLocaleString()}</p>
      <h2>Base Configuration</h2>
      <div className="card flexbox-column">
        <div
          className="labeled-element"
        >
          <label htmlFor="size">Size</label>
          <input
            disabled={isOptimizing}
            id="size"
            max={24}
            min={1}
            onChange={(event) => {
              const newBaseSize = Number(event.target.value);
              if (newBaseSize >= Number(event.target.min) && newBaseSize <= Number(event.target.max)) {
                setSize(Number(event.target.value));
              }
            }}
            type="number"
            value={size}
          />
        </div>
      </div>
      <h2>Room Configuration</h2>
      <div>
        {
          rooms.map((room, r) => (
            <div
              className="card flexbox-row"
              key={r}
            >
              <div
                className="labeled-element"
              >
                <label htmlFor={`room-${r}-name`}>Name</label>
                <input
                  disabled={isOptimizing}
                  id={`room-${r}-name`}
                  onChange={(event) => {
                    const newRoomName = event.target.value;
                    if (!_roomNameIsUnique(newRoomName)) {
                      throw new Error(`A room with name ${newRoomName} already exists.`);
                    }
                    setRooms([
                      ...rooms.slice(0, r),
                      {
                        ...rooms[r],
                        name: newRoomName,
                      },
                      ...rooms.slice(r + 1, rooms.length),
                    ]);
                  }}
                  type="text"
                  value={room.name}
                />
              </div>
              <div
                className="labeled-element"
              >
                <label htmlFor={`room-${r}-size`}>Size</label>
                <input
                  disabled={isOptimizing}
                  id={`room-${r}-size`}
                  max={16}
                  min={1}
                  onChange={(event) => {
                    const newRoomSize = Number(event.target.value);
                    if (newRoomSize >= Number(event.target.min) && newRoomSize <= Number(event.target.max)) {
                      setRooms([
                        ...rooms.slice(0, r),
                        {
                          ...rooms[r],
                          size: newRoomSize,
                        },
                        ...rooms.slice(r + 1, rooms.length),
                      ]);
                    }
                  }}
                  type="number"
                  value={room.size}
                />
              </div>
              <div
                className="labeled-element"
              >
                <label htmlFor={`room-${r}-color`}>Color</label>
                <input
                  disabled={isOptimizing}
                  id={`room-${r}-color`}
                  onChange={(event) => {
                    const newColor = event.target.value;
                    setRooms([
                      ...rooms.slice(0, r),
                      {
                        ...rooms[r],
                        color: newColor,
                      },
                      ...rooms.slice(r + 1, rooms.length),
                    ]);
                  }}
                  type="color"
                  value={room.color}
                />
              </div>
              <div
                className="labeled-element"
              >
                <label htmlFor={`room-${r}-links`}>Links</label>
                <div
                  id={`room-${r}-links`}
                  style={{
                    paddingLeft: "1vmin",
                    paddingTop: "1vmin",
                  }}
                >
                  {
                    room.links.map((link, l) => (
                      <div
                        className="flexbox-row"
                        key={l}
                      >
                        <div
                          className="labeled-element"
                        >
                          <label htmlFor={`room-${r}-link-${l}-name`}>Name</label>
                          <select
                            disabled={isOptimizing}
                            id={`room-${r}-link-${l}-name`}
                            onChange={(event) => {
                              const oldLinkName = link.name;
                              const newLinkName = event.target.value;
                              setRooms(
                                rooms.map((otherRoom) => {
                                  if (otherRoom === room) {
                                    return {
                                      ...room,
                                      links: [
                                        ...room.links.slice(0, l),
                                        {
                                          ...room.links[l],
                                          name: newLinkName,
                                        },
                                        ...room.links.slice(l + 1, room.links.length),
                                      ],
                                    };
                                  }
                                  if (otherRoom.name === oldLinkName) {
                                    return {
                                      ...otherRoom,
                                      links: otherRoom.links.filter((link) => link.name !== room.name),
                                    };
                                  }
                                  if (otherRoom.name === newLinkName) {
                                    return {
                                      ...otherRoom,
                                      links: [
                                        ...otherRoom.links,
                                        {
                                          name: room.name,
                                        },
                                      ],
                                    };
                                  }
                                  return { ...otherRoom };
                                })
                              )
                            }}
                            value={link.name}
                          >
                            {
                              rooms
                                .filter((otherRoom) => otherRoom !== room)
                                .sort((a, b) => (a.name > b.name ? 1 : -1))
                                .map((otherRoom, o) => (
                                  <option
                                    value={otherRoom.name}
                                    key={o}
                                  >
                                    {otherRoom.name}
                                  </option>
                                ))
                            }
                          </select>
                        </div>
                        <div
                          className="labeled-element"
                        >
                          <label htmlFor="link-delete">Delete Link</label>
                          <button
                            id="link-delete"
                            onClick={(_) => {
                              setRooms(
                                rooms.map((otherRoom) => {
                                  if (otherRoom === room) {
                                    return {
                                      ...room,
                                      links: room.links.filter((otherLink) => otherLink.name !== link.name),
                                    };
                                  }
                                  if (otherRoom.name === link.name) {
                                    return {
                                      ...otherRoom,
                                      links: otherRoom.links.filter((otherLink) => otherLink.name !== room.name),
                                    };
                                  }
                                  return { ...otherRoom };
                                })
                              );
                            }}
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ))
                  }
                  <div
                    className="labeled-element"
                  >
                    <label htmlFor="link-add">Add Link</label>
                    <button
                      id="link-add"
                      onClick={(_) => {
                        if (rooms.length < 2) {
                          throw new Error(`There are only ${rooms.length} room(s); not enough to link to another one.`);
                        }
                        const linkableRooms = rooms
                          .filter((otherRoom) =>
                            otherRoom !== room
                            && !room.links
                              .map((link) => link.name)
                              .includes(otherRoom.name)
                          )
                        if (linkableRooms.length < 1) {
                          throw new Error(`There are no other rooms to which this room can be linked.`);
                        }
                        const otherRoom = linkableRooms.find(() => true);
                        if (!otherRoom) {
                          throw new Error(`Somehow 'linkableRooms' contained a falsy element.`);
                        }
                        const otherRoomIndex = rooms.indexOf(otherRoom);
                        const r1 = Math.min(r, otherRoomIndex);
                        const r2 = Math.max(r, otherRoomIndex);
                        setRooms([
                          ...rooms.slice(0, r1),
                          {
                            ...rooms[r1],
                            links: [
                              ...rooms[r1].links,
                              {
                                name: rooms[r2].name,
                              },
                            ],
                          },
                          ...rooms.slice(r1 + 1, r2),
                          {
                            ...rooms[r2],
                            links: [
                              ...rooms[r2].links,
                              {
                                name: rooms[r1].name,
                              },
                            ],
                          },
                          ...rooms.slice(r2 + 1, rooms.length),
                        ]);
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                }}
              >
                <div
                  className="labeled-element"
                >
                  <label htmlFor="room-delete">Delete Room</label>
                  <button
                    id="room-delete"
                    onClick={(_) => {
                      setRooms(
                        rooms
                          .filter((otherRoom) => otherRoom !== room)
                          .map((otherRoom) => ({
                            ...otherRoom,
                            links: otherRoom.links.filter((link) => link.name !== room.name)
                          }))
                      );
                    }}
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          ))
        }
        <div
          className="labeled-element"
        >
          <label htmlFor="room-add">Add Room</label>
          <button
            id="room-add"
            onClick={(_) => {
              setRooms([
                ...rooms,
                {
                  color: _randomColor(),
                  id: _createId(),
                  links: [],
                  name: '',
                  size: 1,
                }
              ]);
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

}
