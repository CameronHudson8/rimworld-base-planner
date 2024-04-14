import { Base } from './Base';

test('constructor works', () => {
  const baseRequirements = {
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
    ]
  };
  const base = new Base(baseRequirements);
  expect(base.getBaseRequirements()).toMatchObject(baseRequirements);
});
