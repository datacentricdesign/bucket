import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import {
  Property as IProperty,
  Thing as IThing,
} from "@datacentricdesign/types";
import Thing from "../Thing";
import PropertyType from "./propertyType/PropertyType";
/**
 * A property belongs to a Thing and represents an entry point for data.
 * It enable to stream data in and out of a Thing. It is characterised
 * by a PropertyType which define the Dimensions of the property.
 */
@Entity()
class Property implements IProperty {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  typeId?: string;

  @ManyToOne(() => PropertyType, (propertyType) => propertyType)
  type: PropertyType;

  @ManyToOne(() => Thing, (thing) => thing.id)
  @JoinColumn({ name: "thingId" })
  thing: IThing;

  values: Array<Array<number | string>>;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  sharedWith?: string[];
}

export default Property;
