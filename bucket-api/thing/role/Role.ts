import {
    Entity,
    Column,
    PrimaryColumn,
} from "typeorm";
import {IsNotEmpty} from "class-validator";

import {Role as IRole} from "../../types";


@Entity()
export class Role implements IRole {

    @PrimaryColumn()
    id: string;

    actorEntityId: string;

    subjectEntityId: string;

    role: string;
}