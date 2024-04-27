import { ReactElement } from "react";

export type CellViewProps = {
  coordinates: number[];
  color?: string;
  roomName?: string;
  setOwnProps: (cellProps: CellViewProps) => void;
  usable: boolean;
}

export type CellViewState = {}

export function CellView(props: CellViewProps): ReactElement {

  return (
    <button
      className={`cell ${!props.usable && "cell-unusable"}`}
      onClick={() => props.setOwnProps({
        ...props,
        usable: !props.usable,
      })}
      style={{ backgroundColor: props.color }}
    >
      {String(props.roomName || '')}
    </button >
  );

}
