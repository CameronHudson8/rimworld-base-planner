import joi from "joi";

import { RoomId, RoomName } from "./room";

export type CellId = string;

export enum CellOwnerType {
  BASE = 'BASE',
};

export interface CellMetadata {
  owner?: {
    type: CellOwnerType,
    id: string,
  },
}

export interface CellSpec {
  roomName?: RoomName;
  usable: boolean;
}

export interface CellStatus {
  roomId?: RoomId,
};

export interface CellData {
  id: CellId,
  metadata: CellMetadata,
  spec: CellSpec,
  status: CellStatus,
};

export const metadataSchema = joi.object<CellMetadata, true>({
  owner: joi.object<{ type: CellOwnerType, id: string }, true>({
    type: joi.string().allow(...Object.values(CellOwnerType)),
    id: joi.string(),
  }).optional(),
});

export const specSchema = joi.object<CellSpec, true>({
  roomName: joi.string().min(0).optional()
    .when('usable', {
      is: false,
      then: joi.forbidden().error(new Error("A cell's roomName can only be set when the cell is usable")),
    }),
  usable: joi.boolean(),
});

export const statusSchema = joi.object<CellStatus, true>({
  roomId: joi.string().optional(),
});

export const schema = joi.object<CellData>({
  id: joi.string(),
  metadata: metadataSchema,
  spec: specSchema,
  status: statusSchema.optional(),
});

export interface Cell {
  readonly id: CellId;
  readonly metadata: CellMetadata;
  readonly spec: CellSpec;
  readonly status: CellStatus;
};

export function cloneCell(cell: Cell): Cell {
  const clone: Cell = {
    id: cell.id,
    metadata: {
      ...(cell.metadata.owner ? {
        owner: {
          type: cell.metadata.owner.type,
          id: cell.metadata.owner.id,
        },
      } : {}),
    },
    spec: {
      roomName: cell.spec.roomName,
      usable: cell.spec.usable,
    },
    status: {
      roomId: cell.status.roomId,
    },
  };
  return clone;
}

export function validate(existingCell: unknown): Cell {
  const { error, value } = schema.validate(existingCell);
  if (error !== undefined) {
    throw error;
  }
  return value;
}

export function validateSpec(existingCellSpec: unknown): CellSpec {
  const { error, value } = specSchema.validate(existingCellSpec);
  if (error !== undefined) {
    throw error;
  }
  return value;
}
