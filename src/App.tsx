import { ReactElement } from 'react';
import './App.css';
import { Base } from './components/Base';
import { RoomProps } from './components/Room';

export type AppProps = {}

export type AppState = {
  rooms: RoomProps[];
}
export function App(props: AppProps): ReactElement {

  const rooms = [
    {
      links: [],
      name: "batteries",
      size: 1
    },
    {
      links: [],
      name: "bedroom-1",
      size: 1
    },
    {
      links: [],
      name: "bedroom-2",
      size: 1
    },
    {
      links: [],
      name: "bedroom-3",
      size: 1
    },
    {
      links: [],
      name: "bedroom-4",
      size: 1
    },
    {
      links: [],
      name: "bedroom-5",
      size: 1
    },
    {
      links: [],
      name: "bedroom-6",
      size: 1
    },
    {
      links: [],
      name: "bedroom-7",
      size: 1
    },
    {
      links: [],
      name: "bedroom-8",
      size: 1
    },
    {
      links: [],
      name: "bedroom-9",
      size: 1
    },
    {
      links: [],
      name: "bedroom-10",
      size: 1
    },
    {
      links: [],
      name: "bedroom-11",
      size: 1
    },
    {
      links: [],
      name: "bedroom-12",
      size: 1
    },
    {
      links: [
        {
          name: "pen-general"
        },
        {
          name: "storage-refrigerated"
        },
        {
          name: "storage-unrefrigerated"
        }
      ],
      name: "butcher",
      size: 1
    },
    {
      links: [
        {
          name: "storage-refrigerated"
        }
      ],
      name: "hospital",
      size: 1
    },
    {
      links: [
        {
          name: "storage-refrigerated"
        },
        {
          name: "storage-unrefrigerated"
        }
      ],
      name: "kitchen",
      size: 1
    },
    {
      links: [
        {
          name: "butcher"
        },
        {
          name: "pen-male-chickens"
        },
        {
          name: "storage-refrigerated"
        }
      ],
      name: "pen-general",
      size: 1
    },
    {
      links: [
        {
          name: "pen-general"
        },
        {
          name: "storage-refrigerated"
        }
      ],
      name: "pen-male-chickens",
      size: 1
    },
    {
      links: [
        {
          name: "storage-refrigerated"
        }
      ],
      name: "prison",
      size: 1
    },
    {
      links: [
        {
          name: "storage-refrigerated"
        }
      ],
      name: "rec-room-and-temple",
      size: 6
    },
    {
      links: [
        {
          name: "butcher"
        },
        {
          name: "hospital"
        },
        {
          name: "kitchen"
        },
        {
          name: "pen-general"
        },
        {
          name: "pen-male-chickens"
        },
        {
          name: "prison"
        },
        {
          name: "rec-room-and-temple"
        }
      ],
      name: "storage-refrigerated",
      size: 5
    },
    {
      links: [
        {
          name: "butcher"
        },
        {
          name: "kitchen"
        },
        {
          name: "workshop"
        }
      ],
      name: "storage-unrefrigerated",
      size: 5
    },
    {
      links: [
        {
          name: "storage-unrefrigerated"
        }
      ],
      name: "workshop",
      size: 5
    }
  ];

  return (
    <div
      className="container"
    >
      <h1>Rimworld Base Planner</h1>
      <Base
        rooms={rooms}
      ></Base>
    </div>
  );
}
