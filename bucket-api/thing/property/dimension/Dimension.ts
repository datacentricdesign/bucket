import {
    Entity,
    Column,
    Unique,
    CreateDateColumn,
    UpdateDateColumn, OneToOne, ManyToOne, PrimaryGeneratedColumn
} from "typeorm";
import {Length, IsNotEmpty} from "class-validator";

import { Property } from "../Property"
import {Property as IProperty, Dimension as IDimension} from "../../../types" 

@Entity()
export class Dimension implements IDimension {
    @PrimaryGeneratedColumn()
    id: Number;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    unit: string;

    @ManyToOne(type => Property, property => property)
    property: IProperty;
}