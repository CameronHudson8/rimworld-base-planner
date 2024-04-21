import React from "react";
import './Room.css';

export type RoomProps = {
  links: { name: string }[];
  name: string;
  size: number;
}

export type RoomState = {}

export class Room extends React.Component<RoomProps, RoomState> {

}
