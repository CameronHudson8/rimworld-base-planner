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
        intraRoomWeight={2}
        interRoomWeight={1}
        iterations={Math.pow(2, 18)}
        ></BaseView>
    </div>
  );
}
