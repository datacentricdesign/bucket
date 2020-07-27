import {
    Entity,
    Column, PrimaryColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable
} from "typeorm";
import {Length, IsNotEmpty} from "class-validator";

import { Property } from "../Property"
import {Property as IProperty, Dimension as IDimension} from "../../../types" 
import { PropertyType } from "../propertyType/PropertyType";

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
