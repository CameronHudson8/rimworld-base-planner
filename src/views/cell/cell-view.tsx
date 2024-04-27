import { ReactElement } from "react";
import { Cell } from "../../models";

export type CellViewProps = {
  coordinates: number[];
  color?: string;
  roomName?: string;
  updateSelf: (cell: Cell) => void;
  usable: boolean;
}

export type CellViewState = {}

export function CellView(props: CellViewProps): ReactElement {

  return (
    <button
      className={`cell ${!props.usable && "cell-unusable"}`}
      onClick={() => props.updateSelf({
        ...props,
        usable: !props.usable,
      })}
      style={{
        backgroundColor: props.color,
        textOverflow: 'ellipsis',
      }}
    >
      {String(props.roomName || '')}
    </button >
  );

}
