import {
    Entity,
    Column,
    Unique,
    CreateDateColumn,
    UpdateDateColumn, OneToOne, PrimaryColumn, OneToMany, ManyToOne
} from "typeorm";
import {Length, IsNotEmpty} from "class-validator";
import { Thing } from "../Thing"
import { PropertyType } from "./propertyType/PropertyType"

import {Property as IProperty, Dimension as IDimension, Thing as IThing} from "../../types";
import { Dimension } from "./dimension/Dimension";

@Entity()
export class Property implements IProperty {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @ManyToOne(type => PropertyType, propertyType => propertyType)
    type: PropertyType;

    @OneToOne(type => Thing, thing => thing.properties)
    thing: IThing;

    @OneToMany(type => Dimension, dimension => dimension.property)
    dimensions: IDimension[];

    @Column()
    @CreateDateColumn()
    createdAt: Date;
}