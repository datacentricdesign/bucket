// Type definitions for datacentricdesign (version 0.0.1)
// Project: https://datacentricdesign.org
// Definitions by: datacentricdesign <https://github.com/datacentricdesign>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped


export interface Person {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Thing {
    id: string;
    name: string;
    description: string;
    type: string;
    properties: Property[];
    pem: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Property {
    id: string;
    name: string;
    description: string;
    type: PropertyType;
    thing: Thing;
    dimensions: Dimension[];
    createdAt: Date;
}

export interface PropertyType {
    id: string;
    name: string;
    description: string;
    dimensions: Dimension[];
}

export interface Dimension {
    id: Number;
    name: string;
    description: string;
    unit: string;
    property: Property;
}

export interface Role {
    id: string;
    actorEntityId: string;
    subjectEntityId: string;
    role: string;
}