import { Column, Entity, PrimaryColumn } from "typeorm";

import { Role as IRole } from "@datacentricdesign/types";

@Entity()
export class Role implements IRole {
  @PrimaryColumn()
  id: string;

  @Column()
  actorEntityId: string;

  @Column()
  subjectEntityId: string;

  @Column()
  role: string;
}
