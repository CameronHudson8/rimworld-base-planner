import { Dispatch, ReactElement, SetStateAction, useState } from "react";
import { MessageType } from "../base/base-view";
import { RoomData } from "../../models/room";

export interface CellViewProps {
  cellICoordinate: number,
  cellJCoordinate: number,
  color?: string,
  room?: RoomData;
  roomIsLocked: boolean;
  roomOptions: RoomData[],
  setMessage: Dispatch<SetStateAction<{ text: string; type: MessageType; }>>,
  setRoom: (newRoomName: string) => void,
  setUsable: (usable: boolean) => void,
  unsetRoom: () => void,
  usable: boolean,
}

export function CellView({ cellICoordinate, cellJCoordinate, color, room, roomIsLocked, roomOptions, setMessage, setRoom, setUsable, usable, unsetRoom }: CellViewProps): ReactElement {

  const [isHovered, setIsHovered] = useState(false);

  const AUTO_ROOM_SETTING = {
    id: '<auto>',
    spec: {
      name: roomIsLocked ? '<auto>' : room?.spec.name,
    },
  };

  // This list must also include the currently linked room,
  // or it won't display as the dropdown's current value.
  const roomOptionsWithAuto = [
    AUTO_ROOM_SETTING,
    ...roomOptions
      .sort((a, b) => a.spec.name > b.spec.name ? 1 : -1)
      .map((roomOption) => ({
        ...roomOption,
        spec: {
          ...roomOption.spec,
          name: `🔒 ${roomOption.spec.name}`,
        }
      })),
  ];

  return (
    <button
      className={`cell ${usable ? '' : "cell-unusable"}`}
      onClick={() => setUsable(!usable)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...(color ? { backgroundColor: color } : {}),
        textOverflow: 'ellipsis',
        ...(isHovered ? { opacity: "50%" } : {}),
      }}
    >
      <select
        // disabled={isOptimizing}
        // id={`room-${roomIndex}-link-${linkIndex}`}
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => setIsHovered(false)}
        onChange={(event) => {
          const newRoomId = event.target.value;
          try {
            if (newRoomId === AUTO_ROOM_SETTING.id) {
              unsetRoom();
              return;
            }
            console.log(`setting roomId to ${newRoomId}...`)
            setRoom(newRoomId);
          } catch (err) {
            console.error(err);
            setMessage({
              type: MessageType.ERROR,
              text: String(err),
            });
          }
        }}
        value={roomIsLocked ? room?.id : AUTO_ROOM_SETTING.id}
      >
        {
          roomOptionsWithAuto
            .map((roomOption, roomIndex) => (
              <option
                value={roomOption.id}
                key={`cell-${cellICoordinate}-${cellJCoordinate}-${roomIndex}`}
              >
                {roomOption.spec.name}
              </option>
            ))
        }
      </select>
    </button >
  );

}
