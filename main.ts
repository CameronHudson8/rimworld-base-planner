import { Base } from "./classes/Base";

function main() {
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
                name: 'butcher-0',
                size: 1,
            },
            {
                name: 'bedroom-0',
                size: 1,
            },
            {
                name: 'bedroom-1',
                size: 1,
            },
            {
                name: 'bedroom-2',
                size: 1,
            },
            {
                name: 'bedroom-3',
                size: 1,
            },
            {
                name: 'bedroom-4',
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
                {
                    usable: true,
                },
            ],
        ]
    };
    const base = new Base(baseRequirements);
    const baseLayout = base.getBaseLayout();

    console.log(JSON.stringify(baseLayout, null, 4));
}

main();
