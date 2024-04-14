import { BaseRequirements } from './BaseRequirements';
import { BaseLayout } from './BaseLayout';

export class Base {
  constructor(private requirements: BaseRequirements) { }

  getLayout(): BaseLayout {
    const baseLayout = {
      baseLayout: [
        [
          {
            roomName: "bedroom-0"
          },
          {
            roomName: "bedroom-1"
          },
          {
            roomName: "bedroom-2"
          }
        ],
        [
          {
            roomName: "storage-0"
          },
          {
            roomName: "storage-0"
          },
          {
            roomName: "kitchen-0"
          }
        ],
        [
          {
            roomName: "butcher-0"
          },
          {
            roomName: "bedroom-3"
          },
          {
            roomName: "bedroom-4"
          }
        ]
      ]
    };
    return baseLayout;
  }

  getBaseRequirements(): BaseRequirements {
    return this.requirements;
  }
}
