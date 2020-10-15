import {
    Entity,
    Column,
    Unique,
    CreateDateColumn,
    UpdateDateColumn, OneToOne, PrimaryColumn, OneToMany, ManyToOne, ManyToMany, JoinTable, JoinColumn
} from "typeorm";
import {Length, IsNotEmpty} from "class-validator";
import { Thing } from "../Thing"
import { PropertyType } from "./propertyType/PropertyType"

import {Property as IProperty, Dimension as IDimension, Thing as IThing} from "@datacentricdesign/types";
import { Dimension } from "./dimension/Dimension";

@Entity()
export class Property implements IProperty {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    typeId?: string;

    @ManyToOne(type => PropertyType, propertyType => propertyType)
    type: PropertyType;

    @ManyToOne(type => Thing, thing => thing.id)
    @JoinColumn({name:"thingId"})
    thing: IThing;

    values: Array<Array<number|string>>;

    @Column()
    @CreateDateColumn()
    createdAt: Date;

    sharedWith: string[];
}