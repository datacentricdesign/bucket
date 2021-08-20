import { Entity, Column, PrimaryColumn } from "typeorm";

import { Dimension as IDimension } from "@datacentricdesign/types";

/**
 * A Dimension composes a PropertyType such as 'x' is a Dimension of 'ACCELEROMETER'.
 * @property {string} id - Unique identifier of the dimension
 * @property {string} name - Display name of the dimension
 * @property {string} description - Any relevant information for this dimension
 * @property {string} unit - The dimension's unit (e.g. m/s^2 for dimension x of ACCELEROMETER)
 * @property {string} type - The data type including string, number or boolean
 * @property {string[]} labels - An array of string that represents labels of a numerical values, the first label for the value 0, second for 1 and so on.
 */
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

  @Column({
    type: "simple-array",
    default: ""
  })
  labels?: string[];
}
