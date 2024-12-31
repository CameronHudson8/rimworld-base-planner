import joi from "joi";

import { padWithZeros } from "../utils";

export type RoomId = string;
export type RoomName = string;


export enum RoomOwnerType {
  BASE = 'BASE',
};

export interface RoomMetadata {
  owner?: {
    type: RoomOwnerType,
    id: string,
  },
}

export interface RoomSpec {
  color: string;
  name: RoomName;
  size: number;
};

export type RoomStatus = object;

export interface RoomData {
  id: RoomId,
  metadata: RoomMetadata,
  spec: RoomSpec,
  status: RoomStatus
};

export const metadataSchema = joi.object<RoomMetadata, true>({
  owner: joi.object<{ type: RoomOwnerType, id: string }, true>({
    type: joi.string().allow(...Object.values(RoomOwnerType)),
    id: joi.string(),
  }).optional(),
});

export const specSchema = joi.object<RoomSpec, true>({
  color: joi.string().regex(/#[a-f0-9]{6}/i),
  name: joi.string().min(0),
  size: joi.number().min(0),
});

export const statusSchema = joi.object<RoomStatus, true>({});

export const dataSchema = joi.object<RoomData, true>({
  id: joi.string(),
  metadata: metadataSchema,
  spec: specSchema,
  status: statusSchema.optional(),
});

export const schema = joi.object<Room, true>({
  id: joi.string(),
  metadata: metadataSchema,
  spec: specSchema,
  status: statusSchema.optional(),
});

export interface Room {
  readonly id: RoomId;
  readonly metadata: RoomMetadata;
  readonly spec: RoomSpec;
  readonly status: RoomStatus;
};

// This returns a deep clone of an existing class instance. No object references are preserved.
export function clone(room: Room): Room {
  const clone: Room = {
    id: room.id,
    metadata: {
      ...(room.metadata.owner ? {
        owner: {
          type: room.metadata.owner.type,
          id: room.metadata.owner.id,
        }
      } : {}),
    },
    spec: {
      color: room.spec.color,
      name: room.spec.name,
      size: room.spec.size,
    },
    status: {},
  };
  return clone;
};

// This accepts an unknown variable, performs validation, and returns a class instance.
// It does not preserve references to any objects or sub-objects that are passed in.
export function validate(existingRoom: unknown): Room {
  const { error, value } = schema.validate(existingRoom);
  if (error !== undefined) {
    throw error;
  }
  return value;
};

// This accepts an unknown variable, performs validation, and returns a spec.
// It does not preserve references to any objects or sub-objects that are passed in.
export function validateSpec(existingRoomSpec: unknown): RoomSpec {
  const { error, value } = specSchema.validate(existingRoomSpec);
  if (error !== undefined) {
    throw error;
  }
  return value;
}

export function randomColor(): string {
  const colorsHex = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((color) => {
      const hex = Number(color).toString(16);
      const paddedHex = padWithZeros(hex, 2);
      return paddedHex;
    });
  return `#${colorsHex.join('')}`;
};
