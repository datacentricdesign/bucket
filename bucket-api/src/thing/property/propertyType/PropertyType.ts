import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable } from "typeorm";
import { PropertyType as IPropertyType } from "@datacentricdesign/types";
import { Dimension } from "../dimension/Dimension";

@Entity()
export class PropertyType implements IPropertyType {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @ManyToMany(() => Dimension, { cascade: true })
  @JoinTable()
  dimensions: Dimension[];
}
