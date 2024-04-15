import {
  Base,
  BaseOptions,
  NotEnoughSpaceError
} from './Base';

describe('Base', () => {

  let baseOptions: BaseOptions;

  beforeEach(() => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 2,
        },
        {
          name: 'kitchen-0',
          size: 1,
        },
        {
          name: 'bedroom-0',
          size: 1,
        },
      ],
      cells: [
        [
          {
            usable: true,
          },
          {
            usable: true,
          },
        ],
        [
          {
            usable: true,
          },
          {
            usable: true,
          },
        ],
      ]
    };
  });

  test('constructor works', () => {
    expect(new Base(baseOptions)).toBeDefined();
  });

  test('constructor errors if there is not enough space available', () => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 2,
        },
      ],
      cells: [
        [
          {
            usable: true,
          }
        ]
      ]
    };
    expect(() => new Base(baseOptions)).toThrow(NotEnoughSpaceError);
  });

  test('Cell naming works for 1x1 base', () => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 1,
        },
      ],
      cells: [
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseOptions);
    expect(base.getBaseLayout()).toMatchObject([
      [
        {
          roomName: 'storage-0'
        }
      ]
    ]);
  });

  test('Cell naming works for 1x1 base if not all cells are used', () => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 0,
        },
      ],
      cells: [
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseOptions);
    expect(base.getBaseLayout()).toMatchObject([
      [
        {
          used: false
        }
      ]
    ]);
  });

  test('Cell naming works for 3x1 base with multiple rooms', () => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 1,
        },
        {
          name: 'storage-0',
          size: 0,
        },
        {
          name: 'kitchen-0',
          size: 2,
        },
      ],
      cells: [
        [
          {
            usable: true,
          }
        ],
        [
          {
            usable: true,
          }
        ],
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseOptions);
    expect(base.getBaseLayout()).toMatchObject([
      [
        {
          roomName: 'storage-0',
          used: true,
        }
      ],
      [
        {
          roomName: 'kitchen-0',
          used: true,
        }
      ],
      [
        {
          roomName: 'kitchen-0',
          used: true,
        }
      ],
    ]);
  });

  test('Cell naming works when some cells are not usable', () => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 1,
        },
        {
          name: 'kitchen-0',
          size: 1,
        },
      ],
      cells: [
        [
          {
            usable: true,
          }
        ],
        [
          {
            usable: false,
          }
        ],
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseOptions);
    expect(base.getBaseLayout()).toMatchObject([
      [
        {
          roomName: 'storage-0',
          used: true,
        }
      ],
      [
        {
          used: false,
        }
      ],
      [
        {
          roomName: 'kitchen-0',
          used: true,
        }
      ],
    ]);
  });

  test('Can get distance to nearest cell by name', () => {
    baseOptions = {
      rooms: [
        {
          name: 'storage-0',
          size: 2,
        },
      ],
      cells: [
        [
          {
            usable: true,
          }
        ],
        [
          {
            usable: false,
          }
        ],
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseOptions);
    const baseLayout = base.getBaseLayout();
    expect(baseLayout[0][0].roomName).toBe('storage-0');
    const distanceToNearest = baseLayout[0][0].getDistanceToNearest((cell) => cell.roomName === 'storage-0');
    expect(distanceToNearest).toBe(2);
  });

});
