import { Dispatch, ReactElement, SetStateAction, useEffect, useState } from "react";
import { MessageType } from "../base/base-view";
import { RoomData } from "../../models/room";

export interface CellViewProps {
  color?: string,
  room?: RoomData;
  roomIsLocked: boolean;
  roomOptions: RoomData[],
  scaleFactor: number,
  setMessage: Dispatch<SetStateAction<{ text: string; type: MessageType; }>>,
  setRoom: (newRoomName: string) => void,
  setUsable: (usable: boolean) => void,
  unsetRoom: () => void,
  usable: boolean,
}

export function CellView({ color, room, roomIsLocked, roomOptions, scaleFactor, setMessage, setRoom, setUsable, usable, unsetRoom }: CellViewProps): ReactElement {

  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width, height
    };
  }

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


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
        ...(isHovered ? { opacity: "50%" } : {}),
        height: `${100 * scaleFactor}%`,
        textOverflow: 'ellipsis',
        width: `${100 * scaleFactor}%`,
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
            setRoom(newRoomId);
          } catch (err) {
            console.error(err);
            setMessage({
              type: MessageType.ERROR,
              text: String(err),
            });
          }
        }}
        style={{
          fontSize: `${1 * windowDimensions.width / 256 * scaleFactor}rem`,
        }}
        value={roomIsLocked ? room?.id : AUTO_ROOM_SETTING.id}
      >
        {
          roomOptionsWithAuto
            .map((roomOption, roomIndex) => (
              <option
                value={roomOption.id}
                key={roomIndex}
              >
                {roomOption.spec.name}
              </option>
            ))
        }
      </select>
    </button >
  );

}
