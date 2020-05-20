import {
    Entity,
    Column,
    Unique,
    CreateDateColumn,
    UpdateDateColumn, OneToOne, PrimaryColumn, OneToMany
} from "typeorm";
import {Length, IsNotEmpty} from "class-validator";
import { Dimension } from "../dimension/Dimension";

import {PropertyType as IPropertyType, Dimension as IDimension} from "../../../types"


@Entity()
export class PropertyType implements IPropertyType {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @OneToMany(type => Dimension, dimension => dimension.property)
    dimensions: IDimension[];
}