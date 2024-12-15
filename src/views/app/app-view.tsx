import { ReactElement } from 'react';
import './app-view.css';
import { BaseView } from '../base';

export function AppView(): ReactElement {
  return (
    <div
      className="container"
    >
      <h1>Rimworld Base Planner</h1>
      <BaseView></BaseView>
    </div>
  );
}
