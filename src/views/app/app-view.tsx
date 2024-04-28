import { ReactElement } from 'react';
import './app-view.css';
import { BaseView } from '../base';

export type AppViewProps = {}

export type AppViewState = {}

export function AppView(props: AppViewProps): ReactElement {
  return (
    <div
      className="container"
    >
      <h1>Rimworld Base Planner</h1>
      <BaseView
        centerOfMassWeight={0.5}
        intraRoomWeight={2}
        interRoomWeight={1}
        iterations={Math.pow(2, 17)}
      ></BaseView>
    </div>
  );
}
