import { ReactElement } from "react";

export type RoomViewProps = {
  color: string;
  id: string;
  links: { name: string }[];
  name: string;
  size: number;
}

export type RoomViewState = {}

export function RoomView(props: RoomViewProps): ReactElement {
  return (<></>);
}
