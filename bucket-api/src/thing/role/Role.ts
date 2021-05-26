import { Column, Entity, PrimaryColumn } from "typeorm";

import { Role as IRole } from "@datacentricdesign/types";

@Entity()
class Role implements IRole {
  @PrimaryColumn()
  id: string;

  @Column()
  actorEntityId: string;

  @Column()
  subjectEntityId: string;

  @Column()
  role: string;
}

export default Role;
