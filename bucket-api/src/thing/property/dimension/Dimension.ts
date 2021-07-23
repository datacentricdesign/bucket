import { Entity, Column, PrimaryColumn } from "typeorm";

import { Dimension as IDimension } from "@datacentricdesign/types";

@Entity()
export class Dimension implements IDimension {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  unit: string;

  @Column()
  type: string;
}
