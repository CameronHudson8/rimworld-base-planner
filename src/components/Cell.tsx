import { ReactElement } from "react";
import './Cell.css';

export type CellProps = {
  coordinates: number[];
  roomName?: string;
  setOwnProps: (cellProps: CellProps) => void;
  usable: boolean;
}

export type CellState = {}

export function Cell(props: CellProps): ReactElement {

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
