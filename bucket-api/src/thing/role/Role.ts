import { Entity, PrimaryColumn } from "typeorm";

import { Role as IRole } from "@datacentricdesign/types";

@Entity()
export class Role implements IRole {
  @PrimaryColumn()
  id: string;

  actorEntityId: string;

  subjectEntityId: string;

  role: string;
}
