import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable } from "typeorm";
import { Dimension } from "../dimension/Dimension";

import { PropertyType as IPropertyType } from "@datacentricdesign/types";

@Entity()
export class PropertyType implements IPropertyType {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @ManyToMany((type) => Dimension, { cascade: true })
  @JoinTable()
  dimensions: Dimension[];
}
