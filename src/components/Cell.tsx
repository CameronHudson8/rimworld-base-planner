import React from "react";
import './Cell.css';

export type CellProps = {
  coordinates: number[];
  id: string;
  initialUsable?: boolean;
  roomName?: string;
  setUsable: (usable: boolean) => void;
  usable: boolean;
  used: boolean;
}

export type CellState = {}

export class Cell extends React.Component<CellProps, CellState> {

  constructor(props: CellProps) {
    super(props);
    this.state = {
      usable: props.initialUsable ?? false,
    };
  }

  render() {
    return (
      <button
        className={`${this.props.usable && "active-button"}`}
        onClick={() => this.props.setUsable(!this.props.usable)}
      >
        {String(this.props.roomName || '')}
      </button >
    );
  }

}
