import { ReactElement } from "react";

export interface CellViewProps {
  color?: string;
  roomName?: string;
  setUsable: (usable: boolean) => void;
  usable: boolean;
}

export function CellView(props: CellViewProps): ReactElement {
  return (
    <button
      className={`cell ${props.usable ? '' : "cell-unusable"}`}
      onClick={() => props.setUsable(!props.usable)}
      style={{
        ...(props.color ? { backgroundColor: props.color } : {}),
        textOverflow: 'ellipsis',
      }}
    >
      {String(props.roomName || '')}
    </button >
  );

}
