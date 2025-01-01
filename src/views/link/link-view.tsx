import { Dispatch, ReactElement, SetStateAction } from "react";
import { MessageType } from "../base/base-view";
import { RoomData } from "../../models/room";

export interface LinkViewProps {
  deleteLink: () => void,
  linkableRooms: RoomData[],
  linkedRoom: RoomData;
  linkIndex: number,
  // Needed?
  roomIndex: number,
  setLinkedRoomName: (newLinkedRoomName: string) => void;
  setMessage: Dispatch<SetStateAction<{ text: string; type: MessageType; }>>,
}

export function LinkView({ deleteLink, linkableRooms, linkedRoom, linkIndex, roomIndex, setLinkedRoomName, setMessage }: LinkViewProps): ReactElement {
  return (
    <div
      className="flexbox-row"
      key={`room-${roomIndex}-link-${linkIndex}`}
    >
      <div
        className="labeled-element"
      >
        <label htmlFor={`room-${roomIndex}-link-${linkIndex}`}>Other Room Name</label>
        <select
          // disabled={isOptimizing}
          id={`room-${roomIndex}-link-${linkIndex}`}
          onChange={(event) => {
            const newLinkedRoomName = event.target.value;
            try {
              setLinkedRoomName(newLinkedRoomName);
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
                  key={`room-${roomIndex}-link-${linkIndex}-linkable-room-${linkableRoomIndex}`}
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
              deleteLink();
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

}
