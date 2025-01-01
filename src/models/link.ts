import joi from "joi";

import { RoomId, RoomName } from "./room";

export type LinkId = string;

export enum LinkOwnerType {
  BASE = 'BASE',
};

export interface LinkMetadata {
  owner?: {
    type: LinkOwnerType,
    id: string,
  },
}

export interface LinkSpec {
  roomNames: {
    0: RoomName;
    1: RoomName;
  };
};

export interface LinkStatus {
  roomIds: {
    0: RoomId,
    1: RoomId,
  },
};

export interface LinkData {
  id: LinkId,
  metadata: LinkMetadata,
  spec: LinkSpec,
  status: LinkStatus
};

export const metadataSchema = joi.object<LinkMetadata, true>({
  owner: joi.object<{ type: LinkOwnerType, id: string }, true>({
    type: joi.string().allow(...Object.values(LinkOwnerType)),
    id: joi.string(),
  }).optional(),
});

export const specSchema = joi.object<LinkSpec, true>({
  roomNames: joi.object<{ 0: RoomName, 1: RoomName }, true>({
    0: joi.string().min(0),
    1: joi.string().min(0),
  }).assert('.0', joi.invalid(joi.ref('.1')))
});

export const statusSchema = joi.object<LinkStatus, true>({
  roomIds: joi.object<{ 0: RoomId, 1: RoomId }, true>({
    0: joi.string(),
    1: joi.string(),
  }),
});

export const dataSchema = joi.object<LinkData, true>({
  id: joi.string(),
  metadata: metadataSchema,
  spec: specSchema,
  status: statusSchema.optional(),
});

export const schema = joi.object<Link, true>({
  id: joi.string(),
  metadata: metadataSchema,
  spec: specSchema,
  status: statusSchema.optional(),
});

export interface Link {
  readonly id: string;
  readonly metadata: LinkMetadata;
  readonly spec: LinkSpec;
  readonly status: LinkStatus;
};

export function equal(link1: Link, link2: Link): boolean {
  return (link1.spec.roomNames[0] === link2.spec.roomNames[0] && link1.spec.roomNames[1] === link2.spec.roomNames[1])
    || (link1.spec.roomNames[0] === link2.spec.roomNames[1] && link1.spec.roomNames[1] === link2.spec.roomNames[0]);
}

// This accepts an unknown variable, performs validation, and returns a class instance.
// It does not preserve references to any objects or sub-objects that are passed in.
export function validate(existingLink: unknown): Link {
  const { error, value } = schema.validate(existingLink);
  if (error !== undefined) {
    throw error;
  }
  return value;
}

// This accepts an unknown variable, performs validation, and returns a spec.
// It does not preserve references to any objects or sub-objects that are passed in.
export function validateSpec(existingLinkSpec: unknown): LinkSpec {
  const { error, value } = specSchema.validate(existingLinkSpec);
  if (error !== undefined) {
    throw error;
  }
  return value;
}

