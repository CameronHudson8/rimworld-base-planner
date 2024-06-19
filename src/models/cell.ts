export class Cell {
    coordinates: number[];
    roomId?: string;
    usable: boolean;
    constructor({
        coordinates,
        roomId,
        usable = false,
    }: {
        coordinates: number[],
        roomId?: string,
        usable: boolean
    }) {
        this.coordinates = coordinates;
        this.roomId = roomId;
        this.usable = usable;
    }
};
