import { ReactElement } from "react";

export type CellViewProps = {
  coordinates: number[];
  // room?: 
  roomName?: string;
  setOwnProps: (cellProps: CellViewProps) => void;
  usable: boolean;
}

export type CellViewState = {}

export function CellView(props: CellViewProps): ReactElement {

  return (
    <button
      className={`cell ${props.usable ? "cell-usable" : "cell-unusable"}`}
      onClick={() => props.setOwnProps({
        ...props,
        usable: !props.usable,
      })}
    >
      {String(props.roomName || '')}
    </button >
  );

}
