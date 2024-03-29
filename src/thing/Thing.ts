import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryColumn,
  JoinColumn,
} from "typeorm";
import { IsNotEmpty } from "class-validator";
import { Property } from "./property/Property";
import {
  Thing as IThing,
  Property as IProperty,
} from "@datacentricdesign/types";
/**
 * A Thing represents a physical or virtual component collecting data.
 * For example, a phone which collects acceleration, a website recording
 * number of page views.
 */
@Entity()
export class Thing implements IThing {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ default: "" })
  description: string;

  @Column({ default: "" })
  @IsNotEmpty()
  type: string;

  @Column()
  @IsNotEmpty()
  personId: string;

  @OneToMany(() => Property, (property) => property.thing)
  @JoinColumn()
  properties: IProperty[];

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: "" })
  pem: string;
}
