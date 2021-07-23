import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Thing } from "../Thing";
import { PropertyType } from "./propertyType/PropertyType";

import {
  Property as IProperty,
  Thing as IThing,
} from "@datacentricdesign/types";

@Entity()
export class Property implements IProperty {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  typeId?: string;

  @ManyToOne((type) => PropertyType, (propertyType) => propertyType)
  type: PropertyType;

  @ManyToOne((type) => Thing, (thing) => thing.id)
  @JoinColumn({ name: "thingId" })
  thing: IThing;

  values: Array<Array<number | string>>;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  sharedWith?: string[];
}
