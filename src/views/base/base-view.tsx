import { ReactElement, useState } from "react";
import joi from "joi";

import { Base } from '../../models';
import { CellView } from '../cell';
import { Database, defaultData } from "../../storage/database";
import { LocalStorage } from "../../storage/local-storage";
import { randomColor, RoomData, schema as roomSchema } from "../../models/room";
import { BaseData, schema as baseSchema } from "../../models/base";
import { BaseReconciler } from "../../reconcilers/base-reconciler";
import { LinkData, schema as linkSchema } from "../../models/link";
import { CellData, schema as cellSchema } from "../../models/cell";

export type StateData = {
  baseDbData: BaseData[],
  cellDbData: CellData[],
  linkDbData: LinkData[],
  roomDbData: RoomData[],
};

export function BaseView(): ReactElement {

  // 1. Read state from local storage (and validate it).
  // 2. If there is was not [valid] local storage data, use the default base.
  // 3. Wait for user input.
  // 4. Upon user input, begin reconciliation.
  // 5. Save all changes to the "database" (and then to local storage).
  // 6. Call setState with the updated state.

  const LOCAL_STORAGE_KEY = 'rimworld-base-planner';
  const schema = joi.object<StateData, true>({
    baseDbData: joi.array<BaseData[]>().items(baseSchema).min(1),
    cellDbData: joi.array<CellData[]>().items(cellSchema),
    linkDbData: joi.array<LinkData[]>().items(linkSchema),
    roomDbData: joi.array<RoomData[]>().items(roomSchema),
  });
  const localStorage = new LocalStorage(LOCAL_STORAGE_KEY, schema);
  const initialData = localStorage.read(defaultData);

  const [state, _setState] = useState(initialData);
  const setState = (newValue: StateData) => {
    localStorage.write(newValue);
    return _setState(newValue);
  };

  const baseDb = new Database<BaseData>(initialData.baseDbData);
  const cellDb = new Database<CellData>(initialData.cellDbData);
  const linkDb = new Database<LinkData>(initialData.linkDbData);
  const roomDb = new Database<RoomData>(initialData.roomDbData);

  // The BaseReconciler subscribes to change events from the databases and performs reconciliation automatically.
  const dbData = {
    baseDb,
    cellDb,
    linkDb,
    roomDb,
  };
  const baseReconciler = new BaseReconciler(dbData, (newState) => {
    return setState({
      ...state,
      ...newState,
    });
  });

  const baseRecords = baseDb.list();
  const mostRecentBase = baseRecords.pop();
  if (mostRecentBase === undefined) {
    throw new Error(`Somehow local storage had been saved without any base records!`)
  }
  const base = new Base(mostRecentBase);

  // const [isOptimizing, setIsOptimizing] = useState(false);
  enum MessageType {
    ERROR = "ERROR",
    INFO = "INFO",
  }
  const [message, setMessage] = useState<{
    text: string,
    type: MessageType,
  }>({
    text: "Ready.",
    type: MessageType.INFO,
  });

  return (
    <div>
      <div className="cell-grid">
        <h2>Base</h2>
        {
          base.status.cells.map((baseStatusCellRow, i) => (
            <div
              className="cell-row"
              key={String(i)}
            >
              {
                baseStatusCellRow.map((baseStatusCell, j) => {
                  // The cellSpec of the Base (base.spec.cells[][]) will contain roomIds
                  // if cells have been explicitly assigned to rooms by the user,
                  // but not for those cells that have been auto-assigned to rooms.
                  // We can get the final room assignments (explicit + automatic) from base.cells[][].spec.
                  const cell = cellDb.get(baseStatusCell.id);
                  const room = cell.status.roomId === undefined
                    ? undefined
                    : roomDb.get(cell.status.roomId);
                  return (
                    <CellView
                      color={room?.spec.color}
                      key={j}
                      roomName={room?.spec.name}
                      setUsable={(usable: boolean) => {
                        // If it was previously unusable, then it will still have no roomId.
                        // If it was previous usable, then it will now have no roomId.
                        try {
                          base.setCellUsability([i, j], usable);
                          baseDb.put(base);
                        } catch (err) {
                          console.error(err);
                          setMessage({
                            type: MessageType.ERROR,
                            text: String(err),
                          });
                        }
                      }}
                      usable={cell.spec.usable}
                    />
                  );
                })
              }
            </div>
          ))
        }
      </div>
      {
        (() => {
          const errors: string[] = [
            ...(message.type === 'ERROR' ? [message.text] : []),
            ...base.status.errors
              .map((errorWithCode) => Object.values(errorWithCode))
              .flat(),
          ];
          if (errors.length > 0) {
            return errors.map((errorMessage, e) => (
              <p
                className="error"
                key={e}
              >
                {errorMessage}
              </p>
            ));
          }
          return (<p> {message.text}</p>);
        })()
      }

      {/* <p>{isOptimizing}</p> */}
      <button
        // disabled={isOptimizing}
        onClick={() => {
          try {
            setMessage({
              type: MessageType.INFO,
              text: "Optimizing...",
            });
            const { baseDbData, cellDbData } = baseReconciler.optimize(base.id);
            setState({
              ...state,
              baseDbData,
              cellDbData,
            });
          } catch (err) {
            console.error(err);
            setMessage({
              type: MessageType.ERROR,
              text: String(err),
            });
          } finally {
            setMessage({
              type: MessageType.INFO,
              text: 'Ready.',
            });
          }
        }}
      >
        Optimize
      </button>
      <button
        // disabled={isOptimizing}
        onClick={() => {
          const agreed = window.confirm("WARNING: This will permanently delete the existing Base. Continue?");
          if (agreed !== true) {
            return;
          }
          try {
            setState(defaultData);
          } catch (err) {
            console.error(err);
            setMessage({
              type: MessageType.ERROR,
              text: String(err),
            });
          }
        }}
      >
        Reset
      </button>
      {/* {
        isOptimizing && <div className="spinner"></div>
      } */}
      <p>Current energy: {
        base.status.energy.toLocaleString(
          undefined,
          {
            minimumSignificantDigits: 4,
            maximumSignificantDigits: 4,
          }
        )
      }</p>
      <h2>Base Configuration</h2>
      <div className="card flexbox-column">
        <div
          className="labeled-element"
        >
          <label htmlFor="size">Size</label>
          <input
            // disabled={isOptimizing}
            id="size"
            min={0}
            onChange={(event) => {
              const newBaseSize = Number(event.target.value);
              if (newBaseSize < Number(event.target.min)) {
                return;
              }
              try {
                base.setSize(newBaseSize);
                baseDb.put(base);
              } catch (err) {
                console.error(err);
                setMessage({
                  type: MessageType.ERROR,
                  text: String(err),
                });
              }
            }}
            type="number"
            value={base.status.cells.length}
          />
        </div>
      </div>
      <h2>Room Configuration</h2>
      <div>
        {
          base.status.rooms
            .map((roomStatus) => roomDb.get(roomStatus.id))
            .map((room, r) => (
              <div
                className="card flexbox-row"
                key={r}
              >
                <div
                  className="labeled-element"
                >
                  <label htmlFor={`room-${r}-name`}>Room Name</label>
                  <input
                    // disabled={isOptimizing}
                    id={`room-${r}-name`}
                    onChange={(event) => {
                      const newRoomName = event.target.value;
                      try {
                        base.setRoomName(r, newRoomName);
                        // Update the affected links.
                        const affectedLinks = base.status.links
                          .map((baseStatusLink) => linkDb.get(baseStatusLink.id))
                          .filter((link) => link.status.roomIds[0] === room.id || link.status.roomIds[1] === room.id);
                        for (const affectedLink of affectedLinks) {
                          const baseLinkIndex = base.status.links.findIndex((link) => link.id === affectedLink.id);
                          const room0IsAffected = affectedLink.status.roomIds[0] === room.id;
                          const room1IsAffected = affectedLink.status.roomIds[1] === room.id;
                          base.spec.links[baseLinkIndex].roomNames = {
                            0: room0IsAffected ? newRoomName : base.spec.links[baseLinkIndex].roomNames[0],
                            1: room1IsAffected ? newRoomName : base.spec.links[baseLinkIndex].roomNames[1],
                          };
                        }
                        baseDb.put(base);
                      } catch (err) {
                        console.error(err);
                        setMessage({
                          type: MessageType.ERROR,
                          text: String(err),
                        });
                      }
                    }}
                    type="text"
                    value={room.spec.name}
                  />
                </div>
                <div
                  className="labeled-element"
                >
                  <label htmlFor={`room-${r}-size`}>Size</label>
                  <input
                    // disabled={isOptimizing}
                    id={`room-${r}-size`}
                    min={0}
                    onChange={(event) => {
                      const newRoomSize = Number(event.target.value);
                      if (newRoomSize < Number(event.target.min)) {
                        setMessage({
                          type: MessageType.ERROR,
                          text: `The room size ${newRoomSize} is too small.`,
                        });
                        return;
                      }
                      try {
                        base.setRoomSize(r, newRoomSize);
                        baseDb.put(base);
                      } catch (err) {
                        console.error(err);
                        setMessage({
                          type: MessageType.ERROR,
                          text: String(err),
                        });
                      }
                    }}
                    type="number"
                    value={room.spec.size}
                  />
                </div>
                <div
                  className="labeled-element"
                >
                  <label htmlFor={`room-${r}-color`}>Color</label>
                  <input
                    // disabled={isOptimizing}
                    id={`room-${r}-color`}
                    onChange={(event) => {
                      const newRoomColor = event.target.value;
                      try {
                        base.setRoomColor(r, newRoomColor);
                        baseDb.put(base);
                      } catch (err) {
                        console.error(err);
                        setMessage({
                          type: MessageType.ERROR,
                          text: String(err),
                        });
                      }
                    }}
                    type="color"
                    value={room.spec.color}
                  />
                </div>
                <div
                  className="labeled-element"
                >
                  <label htmlFor={`room-${r}-links`}>Links</label>
                  {
                    (() => {
                      const currentLinks = base.status.links
                        .map((baseStatusLink) => baseStatusLink.id)
                        .map((linkId) => linkDb.get(linkId))
                        .filter((link) => link.status.roomIds[0] === room.id || link.status.roomIds[1] === room.id)
                      const currentlyLinkedRooms = currentLinks
                        .map((link) => link.status.roomIds[0] === room.id ? link.status.roomIds[1] : link.status.roomIds[0])
                        .map((otherRoomId) => roomDb.get(otherRoomId));
                      const linkableRooms = base.status.rooms
                        .map((baseStatusRoom) => baseStatusRoom.id)
                        .filter((roomId) => !currentlyLinkedRooms.map((room) => room.id).includes(roomId))
                        .filter((unlinkedRoomId) => unlinkedRoomId !== room.id)
                        .map((unlinkedRoomId) => roomDb.get(unlinkedRoomId));
                      return (
                        <div
                          id={`room-${r}-links`}
                          style={{
                            paddingLeft: "1vmin",
                            paddingTop: "1vmin",
                          }}
                        >
                          {
                            currentLinks.map((link, linkIndex) => {
                              const linkedRoomId = link.status.roomIds[0] === room.id ? link.status.roomIds[1] : link.status.roomIds[0];
                              const linkedRoom = roomDb.get(linkedRoomId);
                              return (
                                <div
                                  className="flexbox-row"
                                  key={`room-${r}-link-${linkIndex}`}
                                >
                                  <div
                                    className="labeled-element"
                                  >
                                    <label htmlFor={`room-${r}-link-${linkIndex}`}>Other Room Name</label>
                                    <select
                                      // disabled={isOptimizing}
                                      id={`room-${r}-link-${linkIndex}`}
                                      onChange={(event) => {
                                        const newLinkedRoomName = event.target.value;
                                        try {
                                          const linkIndexInBaseSpec = base.status.links.findIndex((baseStatusLink) => baseStatusLink.id === link.id);
                                          // The ternaries below are to avoid swapping rooms 0 and 1 inadvertently.
                                          // We just want to update the one room that has changed.
                                          base.setLinkRoomNames(linkIndexInBaseSpec, {
                                            0: link.spec.roomNames[0] === room.spec.name ? link.spec.roomNames[0] : newLinkedRoomName,
                                            1: link.spec.roomNames[1] === room.spec.name ? link.spec.roomNames[1] : newLinkedRoomName,
                                          });
                                          baseDb.put(base);
                                        } catch (err) {
                                          console.error(err);
                                          setMessage({
                                            type: MessageType.ERROR,
                                            text: String(err),
                                          });
                                        }
                                      }}
                                      value={linkedRoom.spec.name}
                                    >
                                      {
                                        // This list must also include the currently linked room,
                                        // or it won't display as the dropdown's current value.
                                        [
                                          linkedRoom,
                                          ...linkableRooms,
                                        ]
                                          .map((room) => room.spec.name)
                                          .sort((a, b) => a > b ? 1 : -1)
                                          .map((linkableRoomName, linkableRoomIndex) => (
                                            <option
                                              value={linkableRoomName}
                                              key={`room-${r}-link-${linkIndex}-linkable-room-${linkableRoomIndex}`}
                                            >
                                              {linkableRoomName}
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
                                      onClick={() => {
                                        try {
                                          base.deleteLink(linkIndex);
                                          baseDb.put(base);
                                        } catch (err) {
                                          console.error(err);
                                          setMessage({
                                            type: MessageType.ERROR,
                                            text: String(err),
                                          });
                                        }
                                      }}
                                    >
                                      -
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          }
                          <div
                            className="labeled-element"
                          >
                            <label htmlFor="link-add">Add Link</label>
                            <button
                              disabled={linkableRooms.length <= 0}
                              id="link-add"
                              onClick={() => {
                                const otherRoomName = linkableRooms[0].spec.name;
                                try {
                                  base.addLink({
                                    0: room.spec.name,
                                    1: otherRoomName,
                                  });
                                  baseDb.put(base);
                                } catch (err) {
                                  console.error(err);
                                  setMessage({
                                    type: MessageType.ERROR,
                                    text: String(err),
                                  });
                                }
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  }
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
                      onClick={() => {
                        try {
                          base.deleteRoom(r);
                          // Updated affected links.
                          const affectedLinks = base.status.links
                            .map((baseStatusLink) => linkDb.get(baseStatusLink.id))
                            .filter((link) => link.status.roomIds[0] === room.id || link.status.roomIds[1] === room.id);
                          for (const affectedLink of affectedLinks) {
                            const baseLinkIndex = base.status.links.findIndex((link) => link.id === affectedLink.id);
                            base.deleteLink(baseLinkIndex);
                          }
                          // Updated affected cells.
                          base.status.cells
                            .map((baseStatusCellRow) => baseStatusCellRow.map((baseStatusCell) => cellDb.get(baseStatusCell.id)))
                            .forEach((cellRow, i) => cellRow.forEach((cell, j) => {
                              if (cell.status.roomId === room.id) {
                                delete base.spec.cells[i][j].roomName;
                              }
                            }));
                          baseDb.put(base);
                        } catch (err) {
                          console.error(err);
                          setMessage({
                            type: MessageType.ERROR,
                            text: String(err),
                          });
                        }
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
            onClick={() => {
              try {
                base.addRoom({
                  color: randomColor(),
                  name: '',
                  size: 1,
                });
                baseDb.put(base);
              } catch (err) {
                console.error(err);
                setMessage({
                  type: MessageType.ERROR,
                  text: String(err),
                });
              }
            }}
          >
            +
          </button>
        </div>
      </div>
    </div >
  );

}
