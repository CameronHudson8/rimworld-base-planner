import {
  Base,
  BaseRequirements,
  NotEnoughSpaceError
} from './Base';

describe('Base', () => {

  let baseRequirements: BaseRequirements;

  beforeEach(() => {
    baseRequirements = {
      roomRequirements: [
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
      spaceAvailable: [
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
  })

  test('constructor works', () => {
    const base = new Base(baseRequirements);
    expect(base.getBaseRequirements()).toMatchObject(baseRequirements);
  });

  test('constructor errors if there is not enough space available', () => {
    baseRequirements = {
      roomRequirements: [
        {
          name: 'storage-0',
          size: 2,
        },
      ],
      spaceAvailable: [
        [
          {
            usable: true,
          }
        ]
      ]
    };
    expect(() => new Base(baseRequirements)).toThrow(NotEnoughSpaceError);
  });

  test('getBaseLayout works for 1x1 base', () => {
    baseRequirements = {
      roomRequirements: [
        {
          name: 'storage-0',
          size: 1,
        },
      ],
      spaceAvailable: [
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseRequirements);
    expect(base.getBaseLayout()).toMatchObject({
      baseLayout: [
        [
          {
            roomName: 'storage-0'
          }
        ]
      ]
    });
  });

  test('getBaseLayout works for 1x1 base if not all cells are used', () => {
    baseRequirements = {
      roomRequirements: [
        {
          name: 'storage-0',
          size: 0,
        },
      ],
      spaceAvailable: [
        [
          {
            usable: true,
          }
        ]
      ]
    };
    const base = new Base(baseRequirements);
    expect(base.getBaseLayout()).toMatchObject({
      baseLayout: [
        [
          {
            used: false
          }
        ]
      ]
    });
  });

  test('_getBaseLayoutNaive works for 3x1 base with multiple rooms', () => {
    baseRequirements = {
      roomRequirements: [
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
      spaceAvailable: [
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
    const base = new Base(baseRequirements);
    expect(base.getBaseLayout()).toMatchObject({
      baseLayout: [
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
      ]
    });
  });

  test('_getBaseLayoutNaive works when some cells are not usable', () => {
    baseRequirements = {
      roomRequirements: [
        {
          name: 'storage-0',
          size: 1,
        },
        {
          name: 'kitchen-0',
          size: 1,
        },
      ],
      spaceAvailable: [
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
    const base = new Base(baseRequirements);
    expect(base.getBaseLayout()).toMatchObject({
      baseLayout: [
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
      ]
    });
  });

});
